from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from services.auth import get_conn

router = APIRouter()


def _range_start(range_: str) -> datetime:
    now = datetime.now()
    if range_ == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_ == "week":
        return now - timedelta(days=7)
    if range_ == "month":
        return now - timedelta(days=30)
    return datetime(1970, 1, 1)


def _session_row(row) -> dict:
    return {
        "id": row["id"],
        "slot": row["slot"],
        "plate": row["plate"],
        "entry": row["entry"],
        "exit": row["exit"],
        "duration_min": row["duration_min"],
        "bill": float(row["bill"]) if row["bill"] is not None else None,
    }


def _sessions_since(range_: str) -> list[dict]:
    since = _range_start(range_)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, slot, plate, entry, exit, duration_min, bill
            FROM parking_sessions
            WHERE entry >= ?
            ORDER BY entry DESC, id DESC
            LIMIT 500
            """,
            (since,),
        ).fetchall() or []
    return [_session_row(row) for row in rows]


@router.get("/parking/slots")
def parking_slots():
    with get_conn() as conn:
        zone_rows = conn.execute(
            "SELECT id, slot, occupied, entry_time FROM zones WHERE zone_type='parking' ORDER BY slot"
        ).fetchall() or []
    return [
        {
            "id": row["id"],
            "slot": row["slot"],
            "status": "occupied" if row["occupied"] else "available",
            "plate": None,
            "since": row["entry_time"],
        }
        for row in zone_rows
    ]


@router.get("/parking/sessions")
def parking_sessions(range: str = Query("week")):
    return _sessions_since(range)


@router.get("/parking/stats")
def parking_stats(range: str = Query("week")):
    sessions = _sessions_since(range)
    completed = [s for s in sessions if s["exit"] is not None]

    with get_conn() as conn:
        slot_stats = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN occupied = 1 THEN 1 ELSE 0 END), 0) AS occupied
            FROM zones
            WHERE zone_type = 'parking'
            """
        ).fetchone()

    total_slots = int(slot_stats["total"] or 0) if slot_stats else 0
    occupied = int(slot_stats["occupied"] or 0) if slot_stats else 0
    total_revenue = sum(float(s["bill"] or 0) for s in completed)
    total_duration = sum(int(s["duration_min"] or 0) for s in completed)
    avg_duration = total_duration / len(completed) if completed else 0
    avg_charge = total_revenue / len(completed) if completed else 0

    return {
        "totalSessions": len(sessions),
        "totalRevenue": round(total_revenue, 2),
        "avgDuration": round(avg_duration, 1),
        "avgCharge": round(avg_charge, 2),
        "occupancyCurrent": occupied,
        "occupancyTotal": total_slots,
        "vehicleTurnover": (len(sessions) // total_slots) if total_slots else 0,
    }


@router.get("/analytics/stats")
def analytics_stats():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT entry, bill, duration_min FROM parking_sessions ORDER BY entry DESC"
        ).fetchall() or []

    total_revenue = sum(float(row["bill"] or 0) for row in rows)
    total_vehicles = len(rows)
    dates = {row["entry"].date().isoformat() for row in rows if row["entry"]}
    avg_daily_revenue = total_revenue / max(1, len(dates))
    avg_session_bill = total_revenue / total_vehicles if total_vehicles else 0

    hour_counts: dict[str, int] = {}
    for row in rows:
        if not row["entry"]:
            continue
        hour = f"{row['entry'].hour:02d}"
        hour_counts[hour] = hour_counts.get(hour, 0) + 1
    peak_hour = max(hour_counts.items(), key=lambda item: item[1])[0] if hour_counts else None

    week_start = datetime.now() - timedelta(days=7)
    prev_start = datetime.now() - timedelta(days=14)
    current_rev = sum(float(r["bill"] or 0) for r in rows if r["entry"] >= week_start)
    previous_rev = sum(float(r["bill"] or 0) for r in rows if prev_start <= r["entry"] < week_start)
    revenue_growth_pct = (
        round(((current_rev - previous_rev) / previous_rev) * 100, 1)
        if previous_rev
        else (100 if current_rev else 0)
    )

    return {
        "totalRevenue": round(total_revenue, 2),
        "totalVehicles": total_vehicles,
        "avgDailyRevenue": round(avg_daily_revenue, 2),
        "avgSessionBill": round(avg_session_bill, 2),
        "peakHour": f"{peak_hour}:00" if peak_hour else "N/A",
        "revenueGrowthPct": revenue_growth_pct,
    }


@router.get("/analytics/revenue")
def analytics_revenue():
    since = datetime.now() - timedelta(days=30)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT DATE(entry) AS date, COALESCE(SUM(bill), 0) AS revenue
            FROM parking_sessions
            WHERE entry >= ?
            GROUP BY DATE(entry)
            ORDER BY DATE(entry)
            """,
            (since,),
        ).fetchall() or []
    return [{"date": str(row["date"]), "revenue": float(row["revenue"] or 0)} for row in rows]


@router.get("/analytics/vehicles")
def analytics_vehicles():
    since = datetime.now() - timedelta(days=30)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT DATE(entry) AS date, COUNT(*) AS vehicles
            FROM parking_sessions
            WHERE entry >= ?
            GROUP BY DATE(entry)
            ORDER BY DATE(entry)
            """,
            (since,),
        ).fetchall() or []
    return [{"date": str(row["date"]), "vehicles": int(row["vehicles"] or 0)} for row in rows]


@router.get("/analytics/activity")
def analytics_activity():
    labels = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        labels.append((day.date().isoformat(), day.strftime("%a")))

    since = today - timedelta(days=6)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT DATE(entry) AS date, COUNT(*) AS vehicles
            FROM parking_sessions
            WHERE entry >= ?
            GROUP BY DATE(entry)
            """,
            (since,),
        ).fetchall() or []

    counts = {str(row["date"]): int(row["vehicles"] or 0) for row in rows}
    return [{"label": label, "vehicles": counts.get(date, 0)} for date, label in labels]
