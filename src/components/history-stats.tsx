import { StatCard } from "@/components/ui/stat-card"
import { StatCardSection } from "@/components/stat-card-section"

export function HistoryStats() {
    return (
        <StatCardSection>
            <StatCard label="Sessions" value="1,248" />
            <StatCard label="Revenue" value="₱48,320" />
            <StatCard label="Avg Duration" value="42m" />
            <StatCard label="Occupancy" value="76%" />
            <StatCard label="Turnover" value="3.2/hr" />
        </StatCardSection>
    )
}