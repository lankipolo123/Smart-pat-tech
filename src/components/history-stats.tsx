import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"
import { parkingHistoryData } from "@/mocks/parking-history.data"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = {
    range: ParkingRange
}

export function HistoryStats({ range }: Props) {
    const { stats } = parkingHistoryData[range]

    return (
        <StatCardSection>
            <StatCard label="Total Sessions" value={stats.totalSessions} />
            <StatCard label="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="Avg Duration" value={`${stats.avgDuration} min`} />
            <StatCard label="Avg Charge" value={`₱${stats.avgCharge.toFixed(2)}`} />
            <StatCard label="Current Occupancy" value={`${stats.occupancyCurrent}/${stats.occupancyTotal}`} />
            <StatCard label="Vehicle Turnover" value={stats.vehicleTurnover} />
        </StatCardSection>
    )
}
