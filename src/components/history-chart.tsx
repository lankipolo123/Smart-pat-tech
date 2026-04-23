import { ChartBar } from "@/components/chartbar"
import { parkingHistoryData } from "@/mocks/parking-history.data"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = {
    range: ParkingRange
}

export function HistoryChart({ range }: Props) {
    return (
        <ChartBar
            data={parkingHistoryData[range].map((d) => ({
                date: d.date,
                desktop: d.entries,
                mobile: d.exits,
            }))}
            title="Parking Flow"
            description="Entries vs Exits"
        />
    )
}