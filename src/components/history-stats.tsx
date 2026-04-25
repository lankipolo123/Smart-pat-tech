import { useEffect, useState } from "react"
import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"
import { fetchParkingStats, type ParkingStats } from "@/services/parking"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = { range: ParkingRange }

export function HistoryStats({ range }: Props) {
    const [stats, setStats] = useState<ParkingStats | null>(null)

    useEffect(() => { fetchParkingStats(range).then(setStats) }, [range])

    if (!stats) return <StatCardSection>{Array.from({length: 6}).map((_, i) => <StatCard key={i} label="—" value="…" />)}</StatCardSection>

    return (
        <StatCardSection>
            <StatCard label="Total Sessions"    value={stats.totalSessions} />
            <StatCard label="Total Revenue"     value={`₱${stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="Avg Duration"      value={`${stats.avgDuration} min`} />
            <StatCard label="Avg Charge"        value={`₱${stats.avgCharge.toFixed(2)}`} />
            <StatCard label="Current Occupancy" value={`${stats.occupancyCurrent}/${stats.occupancyTotal}`} />
            <StatCard label="Vehicle Turnover"  value={stats.vehicleTurnover} />
        </StatCardSection>
    )
}
