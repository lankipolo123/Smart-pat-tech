import { useEffect, useState } from "react"
import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"
import { fetchAnalyticsStats, type AnalyticsStats } from "@/services/analytics"

export function AnalyticsStats() {
    const [stats, setStats] = useState<AnalyticsStats | null>(null)

    useEffect(() => { fetchAnalyticsStats().then(setStats) }, [])

    if (!stats) return <StatCardSection>{Array.from({length: 6}).map((_, i) => <StatCard key={i} label="—" value="…" />)}</StatCardSection>

    return (
        <StatCardSection>
            <StatCard label="Total Revenue"     value={`₱${stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="Total Vehicles"    value={stats.totalVehicles.toLocaleString()} />
            <StatCard label="Avg Daily Revenue" value={`₱${stats.avgDailyRevenue.toLocaleString()}`} />
            <StatCard label="Avg Session Bill"  value={`₱${stats.avgSessionBill.toFixed(2)}`} />
            <StatCard label="Peak Hour"         value={stats.peakHour} />
            <StatCard label="Revenue Growth"    value={`+${stats.revenueGrowthPct}%`} />
        </StatCardSection>
    )
}
