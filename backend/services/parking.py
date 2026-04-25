"""Parking slots, sessions, and analytics DB operations."""

from datetime import date, timedelta
from .auth import get_conn


def init_parking_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS parking_slots (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slot       TEXT UNIQUE NOT NULL,
                status     TEXT NOT NULL DEFAULT 'available',
                plate      TEXT,
                since      TEXT,
                updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS parking_sessions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                slot         TEXT NOT NULL,
                plate        TEXT NOT NULL,
                entry        TEXT NOT NULL,
                exit         TEXT,
                duration_min INTEGER,
                bill         REAL,
                created_at   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now'))
            )
        """)
        _seed(conn)


def _seed(conn):
    if conn.execute("SELECT COUNT(*) FROM parking_slots").fetchone()[0] > 0:
        return

    conn.executemany(
        "INSERT INTO parking_slots (slot, status, plate, since) VALUES (?, ?, ?, ?)",
        [
            ("A1", "occupied",  "ABC 1234", "08:12"),
            ("A2", "available", None,        None),
            ("A3", "reserved",  "DEF 5678",  None),
            ("A4", "available", None,        None),
            ("A5", "available", None,        None),
            ("B1", "occupied",  "GHI 9012",  "09:45"),
            ("B2", "available", None,        None),
            ("B3", "occupied",  "JKL 3456",  "10:30"),
            ("B4", "reserved",  "MNO 7890",  None),
            ("B5", "available", None,        None),
        ]
    )

    t = date.today()

    conn.executemany(
        "INSERT INTO parking_sessions (slot, plate, entry, exit, duration_min, bill) VALUES (?, ?, ?, ?, ?, ?)",
        [
            # Today — active (no exit)
            ("A1", "ABC 1234", f"{t} 08:12:00", None, None, None),
            ("B1", "GHI 9012", f"{t} 09:45:00", None, None, None),
            ("B3", "JKL 3456", f"{t} 10:30:00", None, None, None),
            # This week — completed
            ("A1", "ABC 1234", f"{t - timedelta(days=4)} 08:10:00", f"{t - timedelta(days=4)} 09:30:00", 80,  60.0),
            ("B2", "XYZ 5678", f"{t - timedelta(days=3)} 10:00:00", f"{t - timedelta(days=3)} 12:00:00", 120, 100.0),
            ("A3", "DEF 9012", f"{t - timedelta(days=2)} 14:00:00", f"{t - timedelta(days=2)} 15:30:00", 90,  75.0),
            ("B4", "GHI 3456", f"{t - timedelta(days=1)} 09:00:00", f"{t - timedelta(days=1)} 11:00:00", 120, 100.0),
            # This month (earlier April)
            ("A1", "ABC 1234", "2026-04-01 08:00:00", "2026-04-01 10:00:00", 120, 100.0),
            ("B3", "MNO 2345", "2026-04-03 11:00:00", "2026-04-03 12:30:00", 90,  75.0),
            ("A2", "PQR 6789", "2026-04-07 09:00:00", "2026-04-07 11:00:00", 120, 100.0),
            ("A4", "STU 1122", "2026-04-10 14:00:00", "2026-04-10 15:00:00", 60,  50.0),
            ("B1", "VWX 3344", "2026-04-15 08:30:00", "2026-04-15 10:30:00", 120, 100.0),
            # January 2026
            ("A1", "ABC 1234", "2026-01-05 08:00:00", "2026-01-05 10:00:00", 120, 100.0),
            ("B2", "XYZ 5678", "2026-01-12 09:00:00", "2026-01-12 11:00:00", 120, 100.0),
            ("A2", "JKL 7890", "2026-01-20 10:00:00", "2026-01-20 12:00:00", 120, 100.0),
            # February 2026
            ("B2", "XYZ 5678", "2026-02-12 09:00:00", "2026-02-12 11:00:00", 120, 100.0),
            ("A3", "DEF 9012", "2026-02-20 10:00:00", "2026-02-20 12:00:00", 120, 100.0),
            # March 2026
            ("A3", "DEF 9012", "2026-03-15 08:30:00", "2026-03-15 10:00:00", 90,  75.0),
            ("A2", "GHI 3456", "2026-03-20 10:00:00", "2026-03-20 12:00:00", 120, 100.0),
        ]
    )


def _date_filter(range_: str):
    today = date.today().isoformat()
    if range_ == "today":
        return "entry LIKE ?", (f"{today}%",)
    if range_ == "week":
        return "entry >= ?", ((date.today() - timedelta(days=7)).isoformat(),)
    if range_ == "month":
        return "entry >= ?", (date.today().replace(day=1).isoformat(),)
    return "1=1", ()


def get_slots():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, slot, status, plate, since FROM parking_slots ORDER BY slot"
        ).fetchall()
    return [dict(r) for r in rows]


def get_sessions(range_: str):
    where, params = _date_filter(range_)
    with get_conn() as conn:
        rows = conn.execute(
            f"SELECT id, slot, plate, entry, exit, duration_min, bill FROM parking_sessions WHERE {where} ORDER BY entry DESC",
            params
        ).fetchall()
    return [dict(r) for r in rows]


def get_stats(range_: str):
    sessions = get_sessions(range_)
    with get_conn() as conn:
        occupied    = conn.execute("SELECT COUNT(*) FROM parking_slots WHERE status = 'occupied'").fetchone()[0]
        total_slots = conn.execute("SELECT COUNT(*) FROM parking_slots").fetchone()[0]

    completed     = [s for s in sessions if s["exit"] is not None]
    total_revenue = sum(s["bill"] or 0 for s in completed)
    avg_duration  = int(sum(s["duration_min"] or 0 for s in completed) / len(completed)) if completed else 0
    avg_charge    = total_revenue / len(completed) if completed else 0
    turnover      = len(sessions) // total_slots if total_slots else 0

    return {
        "totalSessions":    len(sessions),
        "totalRevenue":     round(total_revenue, 2),
        "avgDuration":      avg_duration,
        "avgCharge":        round(avg_charge, 2),
        "occupancyCurrent": occupied,
        "occupancyTotal":   total_slots,
        "vehicleTurnover":  turnover,
    }


def get_analytics_stats():
    with get_conn() as conn:
        total_revenue  = conn.execute("SELECT COALESCE(SUM(bill),0) FROM parking_sessions WHERE exit IS NOT NULL").fetchone()[0]
        total_vehicles = conn.execute("SELECT COUNT(*) FROM parking_sessions").fetchone()[0]
        days           = conn.execute("SELECT COUNT(DISTINCT DATE(entry)) FROM parking_sessions WHERE exit IS NOT NULL").fetchone()[0]
        completed      = conn.execute("SELECT COUNT(*) FROM parking_sessions WHERE exit IS NOT NULL").fetchone()[0]
        peak           = conn.execute(
            "SELECT strftime('%H', entry) as hr, COUNT(*) as cnt FROM parking_sessions GROUP BY hr ORDER BY cnt DESC LIMIT 1"
        ).fetchone()

    avg_daily  = total_revenue / days      if days      else 0
    avg_bill   = total_revenue / completed if completed else 0
    peak_hour  = f"{int(peak['hr'])}:00 – {int(peak['hr'])+1}:00" if peak else "N/A"

    return {
        "totalRevenue":     round(total_revenue, 2),
        "totalVehicles":    total_vehicles,
        "avgDailyRevenue":  round(avg_daily, 2),
        "avgSessionBill":   round(avg_bill, 2),
        "peakHour":         peak_hour,
        "revenueGrowthPct": 12.4,
    }


_MONTH_NAMES = {"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun",
                "07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec"}


def get_revenue_data():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT strftime('%Y-%m', entry) as m, SUM(bill) as revenue FROM parking_sessions WHERE exit IS NOT NULL GROUP BY m ORDER BY m"
        ).fetchall()
    return [{"date": _MONTH_NAMES.get(r["m"].split("-")[1], r["m"]), "revenue": round(r["revenue"] or 0, 2)} for r in rows]


def get_vehicle_data():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT strftime('%Y-%m', entry) as m, COUNT(*) as vehicles FROM parking_sessions GROUP BY m ORDER BY m"
        ).fetchall()
    return [{"date": _MONTH_NAMES.get(r["m"].split("-")[1], r["m"]), "vehicles": r["vehicles"]} for r in rows]


def get_activity_data():
    week_ago = (date.today() - timedelta(days=6)).isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT strftime('%w', entry) as dow, COUNT(*) as vehicles FROM parking_sessions WHERE entry >= ? GROUP BY dow",
            (week_ago,)
        ).fetchall()
    day_names = {"0":"Sun","1":"Mon","2":"Tue","3":"Wed","4":"Thu","5":"Fri","6":"Sat"}
    counts = {day_names[r["dow"]]: r["vehicles"] for r in rows}
    return [{"label": d, "vehicles": counts.get(d, 0)} for d in ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]]
