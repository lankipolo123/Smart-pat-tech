const API = "http://localhost:8000"

export type AnalyticsStats = {
    totalRevenue: number
    totalVehicles: number
    avgDailyRevenue: number
    avgSessionBill: number
    peakHour: string
    revenueGrowthPct: number
}

export type RevenuePoint  = { date: string; revenue: number }
export type VehiclePoint  = { date: string; vehicles: number }
export type ActivityPoint = { label: string; vehicles: number }

export async function fetchAnalyticsStats(): Promise<AnalyticsStats | null> {
    try {
        const r = await fetch(`${API}/analytics/stats`)
        if (!r.ok) return null
        return r.json()
    } catch { return null }
}

export async function fetchRevenueData(): Promise<RevenuePoint[]> {
    try {
        const r = await fetch(`${API}/analytics/revenue`)
        if (!r.ok) return []
        return r.json()
    } catch { return [] }
}

export async function fetchVehicleData(): Promise<VehiclePoint[]> {
    try {
        const r = await fetch(`${API}/analytics/vehicles`)
        if (!r.ok) return []
        return r.json()
    } catch { return [] }
}

export async function fetchActivityData(): Promise<ActivityPoint[]> {
    try {
        const r = await fetch(`${API}/analytics/activity`)
        if (!r.ok) return []
        return r.json()
    } catch { return [] }
}
