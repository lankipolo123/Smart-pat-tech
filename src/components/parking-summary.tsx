import { LayoutGrid, Car, CheckSquare, Layers } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export type ParkingSummaryData = {
    totalSpaces: number
    occupied: number
    available: number
    totalVehicles: number
}

type SummaryItem = {
    label: string
    valueKey: keyof ParkingSummaryData
    icon: React.ElementType
    valueColor: string
}

const SUMMARY_ITEMS: SummaryItem[] = [
    { label: "Total Spaces", valueKey: "totalSpaces", icon: LayoutGrid, valueColor: "text-primary" },
    { label: "Occupied", valueKey: "occupied", icon: Car, valueColor: "text-destructive" },
    { label: "Available", valueKey: "available", icon: CheckSquare, valueColor: "text-green-500" },
    { label: "Total of All Vehicle", valueKey: "totalVehicles", icon: Layers, valueColor: "text-primary" },
]

type Props = {
    data?: ParkingSummaryData
}

const DEFAULT_DATA: ParkingSummaryData = {
    totalSpaces: 10,
    occupied: 0,
    available: 10,
    totalVehicles: 0,
}

export function ParkingSummary({ data = DEFAULT_DATA }: Props) {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Summary</p>
            <div className="grid grid-cols-2 gap-2">
                {SUMMARY_ITEMS.map(({ label, valueKey, icon: Icon, valueColor }) => (
                    <Card key={label} size="sm">
                        <CardContent className="flex flex-col gap-1 px-3 py-2">
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Icon className="size-2.5" />
                                <span className="uppercase tracking-wide font-medium leading-tight">{label}</span>
                            </div>
                            <span className={`text-base font-bold ${valueColor}`}>
                                {data[valueKey]}
                            </span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
