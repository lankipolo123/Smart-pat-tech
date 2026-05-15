import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"
import { type ParkingStats } from "@/services/parking"

type Props = {
    stats: ParkingStats | null
    loading: boolean
    error: boolean
}

export function HistoryStats({ stats, loading, error }: Props) {
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
        <div className={`transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
            <StatCardSection>
                <StatCard label="Total Sessions" value={stats.totalSessions} />
                <StatCard label="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString()}`} />
                <StatCard label="Avg Duration" value={`${stats.avgDuration} min`} />
                <StatCard label="Avg Charge" value={`₱${stats.avgCharge.toFixed(2)}`} />
                <StatCard label="Current Occupancy" value={`${stats.occupancyCurrent}/${stats.occupancyTotal}`} />
                <StatCard label="Vehicle Turnover" value={stats.vehicleTurnover} />
            </StatCardSection>
        </div>
    )
}