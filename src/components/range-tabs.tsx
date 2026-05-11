import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parkingRanges, type ParkingRange } from "@/configs/parking-range.config"

type Props = {
    range: ParkingRange
    onRangeChange: (range: ParkingRange) => void
}

export function RangeTabs({ range, onRangeChange }: Props) {
    return (
        <Tabs value={range} onValueChange={(v) => onRangeChange(v as ParkingRange)}>
            <TabsList>
                {parkingRanges.map((r) => (
                    <TabsTrigger key={r.key} value={r.key} className="hover:bg-secondary">
                        {r.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    )
}