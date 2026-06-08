import { withTimeout, fetchJsonWithTimeout } from "@/services/request"

const API_BASE = "/api"

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
        fetchJsonWithTimeout<AnalyticsStats>(`${API_BASE}/analytics/stats`, "Analytics stats"),
        "Analytics stats",
    )
}

export async function fetchRevenueData(): Promise<RevenuePoint[]> {
    return withTimeout(
        fetchJsonWithTimeout<RevenuePoint[]>(`${API_BASE}/analytics/revenue`, "Revenue data"),
        "Revenue data",
    )
}

export async function fetchVehicleData(): Promise<VehiclePoint[]> {
    return withTimeout(
        fetchJsonWithTimeout<VehiclePoint[]>(`${API_BASE}/analytics/vehicles`, "Vehicle data"),
        "Vehicle data",
    )
}

export async function fetchActivityData(): Promise<ActivityPoint[]> {
    return withTimeout(
        fetchJsonWithTimeout<ActivityPoint[]>(`${API_BASE}/analytics/activity`, "Activity data"),
        "Activity data",
    )
}