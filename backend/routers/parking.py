"""routers/parking.py — /parking/*, /sessions, /analytics/*"""

import datetime

from fastapi import APIRouter

from services.auth import get_conn

router = APIRouter()


def _range_start(range_: str) -> str:
    now = datetime.datetime.now()
    if range_ == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    if range_ == "week":
        return (now - datetime.timedelta(days=7)).isoformat()
    if range_ == "month":
        return (now - datetime.timedelta(days=30)).isoformat()
    return "1970-01-01T00:00:00"


def _analytics_window(days: int) -> tuple[str, str]:
    end   = datetime.datetime.now()
    start = end - datetime.timedelta(days=days)
    return start.isoformat(), end.isoformat()


@router.get("/sessions")
def get_sessions():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM parking_sessions ORDER BY id DESC LIMIT 200"
        ).fetchall() or []
    return [dict(r) for r in rows]


@router.get("/parking/sessions")
def parking_sessions(range: str = "today"):
    since = _range_start(range)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM parking_sessions WHERE entry >= ? ORDER BY id DESC LIMIT 500",
            (since,),
        ).fetchall() or []
    return [dict(r) for r in rows]


@router.get("/parking/stats")
def parking_stats(range: str = "today"):
    since = _range_start(range)
    with get_conn() as conn:
        row = conn.execute(
            """SELECT
                COUNT(*)                        AS total_sessions,
                COALESCE(SUM(duration_min), 0)  AS total_minutes,
                COALESCE(SUM(bill), 0)          AS total_revenue,
                COALESCE(AVG(duration_min), 0)  AS avg_duration_min
               FROM parking_sessions WHERE entry >= ?""",
            (since,),
        ).fetchone()
        occupied    = conn.execute("SELECT COUNT(*) FROM zones WHERE occupied=1").fetchone()[0]
        total_zones = conn.execute("SELECT COUNT(*) FROM zones").fetchone()[0]
    total_sessions = row["total_sessions"]
    total_revenue  = round(row["total_revenue"], 2)
    avg_duration   = round(row["avg_duration_min"], 1)
    return {
        "total_sessions":   total_sessions,
        "total_minutes":    round(row["total_minutes"], 1),
        "total_revenue":    total_revenue,
        "avg_duration_min": avg_duration,
        "occupied_now":     occupied,
        "free_now":         max(0, total_zones - occupied),
        "total_zones":      total_zones,
        "totalSessions":    total_sessions,
        "totalRevenue":     total_revenue,
        "avgDuration":      avg_duration,
        "avgCharge":        round(total_revenue / total_sessions, 2) if total_sessions else 0,
        "occupancyCurrent": occupied,
        "occupancyTotal":   total_zones,
        "vehicleTurnover":  total_sessions // total_zones if total_zones else 0,
    }


@router.get("/parking/slots")
def parking_slots():
    with get_conn() as conn:
        zone_rows = conn.execute(
            "SELECT id, slot, occupied, entry_time FROM zones WHERE zone_type='parking' ORDER BY slot"
        ).fetchall() or []
        if zone_rows:
            return [
                {
                    "id":     r["id"],
                    "slot":   r["slot"],
                    "status": "occupied" if r["occupied"] else "available",
                    "plate":  None,
                    "since":  r["entry_time"],
                }
                for r in zone_rows
            ]
        rows = conn.execute(
            "SELECT id, slot, status, plate, since FROM parking_slots ORDER BY slot"
        ).fetchall() or []
    return [dict(r) for r in rows]


@router.get("/analytics/stats")
def analytics_stats():
    week_start, now = _analytics_window(7)
    prev_start = (datetime.datetime.fromisoformat(week_start) - datetime.timedelta(days=7)).isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT entry, bill FROM parking_sessions ORDER BY entry"
        ).fetchall() or []
        peak = conn.execute(
            """SELECT strftime('%H', entry) AS hour, COUNT(*) AS n
               FROM parking_sessions WHERE entry IS NOT NULL
               GROUP BY hour ORDER BY n DESC, hour ASC LIMIT 1"""
        ).fetchone()
        current = conn.execute(
            "SELECT COALESCE(SUM(bill), 0) FROM parking_sessions WHERE entry >= ? AND entry <= ?",
            (week_start, now),
        ).fetchone()[0]
        previous = conn.execute(
            "SELECT COALESCE(SUM(bill), 0) FROM parking_sessions WHERE entry >= ? AND entry < ?",
            (prev_start, week_start),
        ).fetchone()[0]

    total_revenue = sum(float(r["bill"] or 0) for r in rows)
    billed_rows   = [r for r in rows if r["bill"] is not None]
    dates         = {str(r["entry"])[:10] for r in rows if r["entry"]}
    avg_daily     = total_revenue / max(1, len(dates))
    avg_session   = total_revenue / max(1, len(billed_rows))
    growth = round(((current - previous) / previous) * 100, 1) if previous else (100.0 if current else 0.0)

    return {
        "totalRevenue":     round(total_revenue, 2),
        "totalVehicles":    len(rows),
        "avgDailyRevenue":  round(avg_daily, 2),
        "avgSessionBill":   round(avg_session, 2),
        "peakHour":         f"{peak['hour']}:00" if peak and peak["hour"] is not None else "N/A",
        "revenueGrowthPct": growth,
    }


@router.get("/analytics/revenue")
def analytics_revenue():
    since, _ = _analytics_window(30)
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(entry) AS date, COALESCE(SUM(bill), 0) AS revenue
               FROM parking_sessions WHERE entry >= ?
               GROUP BY date(entry) ORDER BY date(entry)""",
            (since,),
        ).fetchall() or []
    return [{"date": r["date"], "revenue": round(r["revenue"], 2)} for r in rows]


@router.get("/analytics/vehicles")
def analytics_vehicles():
    since, _ = _analytics_window(30)
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(entry) AS date, COUNT(*) AS vehicles
               FROM parking_sessions WHERE entry >= ?
               GROUP BY date(entry) ORDER BY date(entry)""",
            (since,),
        ).fetchall() or []
    return [{"date": r["date"], "vehicles": r["vehicles"]} for r in rows]


@router.get("/analytics/activity")
def analytics_activity():
    today  = datetime.date.today()
    labels = [(today - datetime.timedelta(days=i)) for i in range(6, -1, -1)]
    counts = {d.isoformat(): 0 for d in labels}
    since  = labels[0].isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(entry) AS date, COUNT(*) AS vehicles
               FROM parking_sessions WHERE entry >= ?
               GROUP BY date(entry)""",
            (since,),
        ).fetchall() or []
    for r in rows:
        if r["date"] in counts:
            counts[r["date"]] = r["vehicles"]
    return [
        {"label": d.strftime("%a"), "vehicles": counts[d.isoformat()]}
        for d in labels
    ]