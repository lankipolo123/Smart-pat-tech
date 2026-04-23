import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"
import { analyticsStats } from "@/mocks/analytics.data"

export function AnalyticsStats() {
    const s = analyticsStats

    return (
        <StatCardSection>
            <StatCard label="Total Revenue"       value={`₱${s.totalRevenue.toLocaleString()}`} />
            <StatCard label="Total Vehicles"      value={s.totalVehicles.toLocaleString()} />
            <StatCard label="Avg Daily Revenue"   value={`₱${s.avgDailyRevenue.toLocaleString()}`} />
            <StatCard label="Avg Session Bill"    value={`₱${s.avgSessionBill.toFixed(2)}`} />
            <StatCard label="Peak Hour"           value={s.peakHour} />
            <StatCard label="Revenue Growth"      value={`+${s.revenueGrowthPct}%`} />
        </StatCardSection>
    )
}
