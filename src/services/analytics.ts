import { withTimeout } from "@/services/request"
import { fetchJsonWithTimeout } from "@/services/request"

const FASTAPI_BASE = "http://localhost:8000"

// ── Types (identical shapes to before) ───────────────────────────────────────
export type AnalyticsStats = {
    totalRevenue: number
    totalVehicles: number
    avgDailyRevenue: number
    avgSessionBill: number
    peakHour: string
    revenueGrowthPct: number
}

export type RevenuePoint = { date: string; revenue: number }
export type VehiclePoint = { date: string; vehicles: number }
export type ActivityPoint = { label: string; vehicles: number }

export async function fetchAnalyticsStats(): Promise<AnalyticsStats | null> {
    return withTimeout(
        fetchJsonWithTimeout<AnalyticsStats>(`${FASTAPI_BASE}/analytics/stats`, "Analytics stats"),
        "Analytics stats",
    )
}

export async function fetchRevenueData(): Promise<RevenuePoint[]> {
    return withTimeout(
        fetchJsonWithTimeout<RevenuePoint[]>(`${FASTAPI_BASE}/analytics/revenue`, "Revenue data"),
        "Revenue data",
    )
}

export async function fetchVehicleData(): Promise<VehiclePoint[]> {
    return withTimeout(
        fetchJsonWithTimeout<VehiclePoint[]>(`${FASTAPI_BASE}/analytics/vehicles`, "Vehicle data"),
        "Vehicle data",
    )
}

export async function fetchActivityData(): Promise<ActivityPoint[]> {
    return withTimeout(
        fetchJsonWithTimeout<ActivityPoint[]>(`${FASTAPI_BASE}/analytics/activity`, "Activity data"),
        "Activity data",
    )
}
