export type RevenuePoint = {
    date: string
    revenue: number
}

export type VehiclePoint = {
    date: string
    vehicles: number
}

export type AnalyticsStats = {
    totalRevenue: number
    totalVehicles: number
    avgDailyRevenue: number
    peakHour: string
    avgSessionBill: number
    revenueGrowthPct: number
}

export const analyticsStats: AnalyticsStats = {
    totalRevenue: 64000,
    totalVehicles: 1280,
    avgDailyRevenue: 2133,
    peakHour: "7:00 PM – 8:00 PM",
    avgSessionBill: 50,
    revenueGrowthPct: 12.4,
}

export const revenueData: RevenuePoint[] = [
    { date: "Jan", revenue: 14500 },
    { date: "Feb", revenue: 15200 },
    { date: "Mar", revenue: 16800 },
    { date: "Apr", revenue: 17500 },
]

export const vehicleData: VehiclePoint[] = [
    { date: "Jan", vehicles: 290 },
    { date: "Feb", vehicles: 310 },
    { date: "Mar", vehicles: 340 },
    { date: "Apr", vehicles: 340 },
]
