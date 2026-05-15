import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"
import { type AnalyticsStats as AnalyticsStatsType } from "@/services/analytics"

type Props = {
    stats: AnalyticsStatsType | null
    loading: boolean
    error: boolean
}

export function AnalyticsStats({ stats, loading, error }: Props) {
    if (loading && !stats) {
        return (
            <StatCardSection>
                {Array.from({ length: 6 }).map((_, i) => (
                    <StatCard key={i} label="—" value="…" />
                ))}
            </StatCardSection>
        )
    }

    if (error || !stats) {
        return (
            <StatCardSection>
                {Array.from({ length: 6 }).map((_, i) => (
                    <StatCard key={i} label="—" value="N/A" />
                ))}
            </StatCardSection>
        )
    }

    return (
        <StatCardSection>
            <StatCard label="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="Total Vehicles" value={stats.totalVehicles.toLocaleString()} />
            <StatCard label="Avg Daily Revenue" value={`₱${stats.avgDailyRevenue.toLocaleString()}`} />
            <StatCard label="Avg Session Bill" value={`₱${stats.avgSessionBill.toFixed(2)}`} />
            <StatCard label="Peak Hour" value={stats.peakHour} />
            <StatCard label="Revenue Growth" value={`+${stats.revenueGrowthPct}%`} />
        </StatCardSection>
    )
}