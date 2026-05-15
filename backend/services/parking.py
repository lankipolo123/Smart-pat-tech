# services/parking.py

import json

from datetime import date, timedelta
from .auth import get_conn


def init_parking_db():
    with get_conn() as conn:

        # ── parking slots ─────────────────────────────────────────────
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

        # ── parking sessions ──────────────────────────────────────────
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

        # ── parking polygons/zones ───────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS parking_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id INTEGER DEFAULT 0,
                slot TEXT NOT NULL,
                points TEXT NOT NULL,
                occupied INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%S', 'now')
                )
            )
        """)

        _seed(conn)


def _seed(conn):

    if conn.execute(
        "SELECT COUNT(*) FROM parking_slots"
    ).fetchone()[0] > 0:
        return

    conn.executemany(
        """
        INSERT INTO parking_slots
        (slot, status, plate, since)
        VALUES (?, ?, ?, ?)
        """,
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
        """
        INSERT INTO parking_sessions
        (slot, plate, entry, exit, duration_min, bill)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            # today - ongoing
            ("A1", "ABC 1234", f"{t} 08:12:00", None, None, None),
            ("B1", "GHI 9012", f"{t} 09:45:00", None, None, None),
            ("B3", "JKL 3456", f"{t} 10:30:00", None, None, None),

            # today - completed
            ("A2", "DEF 0001", f"{t} 07:00:00", f"{t} 08:00:00", 60, 50.0),
            ("A3", "DEF 0002", f"{t} 06:30:00", f"{t} 07:45:00", 75, 60.0),

            # within last 7 days - completed
            ("A1", "ABC 1234",
             f"{t - timedelta(days=2)} 08:10:00",
             f"{t - timedelta(days=2)} 09:30:00",
             80, 60.0),
            ("B2", "XYZ 5678",
             f"{t - timedelta(days=3)} 10:00:00",
             f"{t - timedelta(days=3)} 12:00:00",
             120, 100.0),
            ("A4", "PLT 4444",
             f"{t - timedelta(days=5)} 11:00:00",
             f"{t - timedelta(days=5)} 13:00:00",
             120, 90.0),
            ("B4", "PLT 5555",
             f"{t - timedelta(days=6)} 09:00:00",
             f"{t - timedelta(days=6)} 10:30:00",
             90, 70.0),

            # within last 30 days but older than 7 days
            ("A2", "PLT 1111",
             f"{t - timedelta(days=10)} 09:00:00",
             f"{t - timedelta(days=10)} 11:00:00",
             120, 80.0),
            ("B4", "PLT 2222",
             f"{t - timedelta(days=15)} 14:00:00",
             f"{t - timedelta(days=15)} 15:30:00",
             90, 60.0),
            ("A5", "PLT 6666",
             f"{t - timedelta(days=20)} 08:00:00",
             f"{t - timedelta(days=20)} 09:30:00",
             90, 70.0),
            ("B5", "PLT 7777",
             f"{t - timedelta(days=25)} 13:00:00",
             f"{t - timedelta(days=25)} 14:30:00",
             90, 65.0),

            # older than 30 days - only shows in all time
            ("A3", "PLT 3333",
             f"{t - timedelta(days=45)} 08:00:00",
             f"{t - timedelta(days=45)} 10:00:00",
             120, 100.0),
            ("B1", "PLT 8888",
             f"{t - timedelta(days=60)} 10:00:00",
             f"{t - timedelta(days=60)} 12:00:00",
             120, 90.0),
            ("A1", "PLT 9999",
             f"{t - timedelta(days=90)} 09:00:00",
             f"{t - timedelta(days=90)} 11:00:00",
             120, 85.0),
        ]
    )


# ────────────────────────────────────────────────────────────────────
# helpers
# ────────────────────────────────────────────────────────────────────

def _date_filter(range_: str):

    today = date.today().isoformat()

    if range_ == "today":
        return "entry LIKE ?", (f"{today}%",)

    if range_ == "week":
        return "entry >= ?", (
            (date.today() - timedelta(days=7)).isoformat(),
        )

    if range_ == "month":
        return "entry >= ?", (
            date.today().replace(day=1).isoformat(),
        )

    return "1=1", ()


# ────────────────────────────────────────────────────────────────────
# parking slots
# ────────────────────────────────────────────────────────────────────

def get_slots():

    with get_conn() as conn:

        rows = conn.execute(
            """
            SELECT
                id,
                slot,
                status,
                plate,
                since
            FROM parking_slots
            ORDER BY slot
            """
        ).fetchall()

    return [dict(r) for r in rows]


# ────────────────────────────────────────────────────────────────────
# parking sessions
# ────────────────────────────────────────────────────────────────────

def get_sessions(range_: str):

    where, params = _date_filter(range_)

    with get_conn() as conn:

        rows = conn.execute(
            f"""
            SELECT
                id,
                slot,
                plate,
                entry,
                exit,
                duration_min,
                bill
            FROM parking_sessions
            WHERE {where}
            ORDER BY entry DESC
            """,
            params
        ).fetchall()

    return [dict(r) for r in rows]


# ────────────────────────────────────────────────────────────────────
# parking stats
# ────────────────────────────────────────────────────────────────────

def get_stats(range_: str):

    sessions = get_sessions(range_)

    with get_conn() as conn:

        occupied = conn.execute(
            """
            SELECT COUNT(*)
            FROM parking_slots
            WHERE status = 'occupied'
            """
        ).fetchone()[0]

        total_slots = conn.execute(
            "SELECT COUNT(*) FROM parking_slots"
        ).fetchone()[0]

    completed = [
        s for s in sessions
        if s["exit"] is not None
    ]

    total_revenue = sum(
        s["bill"] or 0 for s in completed
    )

    avg_duration = int(
        sum(s["duration_min"] or 0 for s in completed)
        / len(completed)
    ) if completed else 0

    avg_charge = (
        total_revenue / len(completed)
    ) if completed else 0

    turnover = (
        len(sessions) // total_slots
    ) if total_slots else 0

    return {
        "totalSessions": len(sessions),
        "totalRevenue": round(total_revenue, 2),
        "avgDuration": avg_duration,
        "avgCharge": round(avg_charge, 2),
        "occupancyCurrent": occupied,
        "occupancyTotal": total_slots,
        "vehicleTurnover": turnover,
    }


# ────────────────────────────────────────────────────────────────────
# analytics
# ────────────────────────────────────────────────────────────────────

def get_analytics_stats():

    with get_conn() as conn:

        total_revenue = conn.execute(
            """
            SELECT COALESCE(SUM(bill),0)
            FROM parking_sessions
            WHERE exit IS NOT NULL
            """
        ).fetchone()[0]

        total_vehicles = conn.execute(
            "SELECT COUNT(*) FROM parking_sessions"
        ).fetchone()[0]

    return {
        "totalRevenue": round(total_revenue, 2),
        "totalVehicles": total_vehicles,
    }


# ────────────────────────────────────────────────────────────────────
# parking zones CRUD (aligned with main zones table)
# ────────────────────────────────────────────────────────────────────

def create_zone(
    slot: str,
    points,
    camera_id: int = 0
):

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO zones
            (slot, points, zone_type)
            VALUES (?, ?, ?)
            """,
            (
                slot,
                json.dumps(points),
                "parking",
            )
        )


def get_zones():

    with get_conn() as conn:

        rows = conn.execute(
            """
            SELECT
                id,
                slot,
                points,
                occupied,
                zone_type,
                entry_time
            FROM zones
            ORDER BY slot
            """
        ).fetchall()

    zones = []

    for row in rows:

        zones.append({
            "id": row["id"],
            "slot": row["slot"],
            "occupied": bool(row["occupied"]),
            "zone_type": row["zone_type"],
            "entry_time": row["entry_time"],
            "points": json.loads(row["points"])
        })

    return zones


def update_zone(
    zone_id: int,
    slot: str,
    points
):

    with get_conn() as conn:

        conn.execute(
            """
            UPDATE zones
            SET slot = ?, points = ?
            WHERE id = ?
            """,
            (
                slot,
                json.dumps(points),
                zone_id
            )
        )


def delete_zone(zone_id: int):

    with get_conn() as conn:

        conn.execute(
            """
            DELETE FROM zones
            WHERE id = ?
            """,
            (zone_id,)
        )


def set_zone_occupied(
    zone_id: int,
    occupied: bool
):

    with get_conn() as conn:

        conn.execute(
            """
            UPDATE zones
            SET occupied = ?
            WHERE id = ?
            """,
            (
                1 if occupied else 0,
                zone_id
            )
        )