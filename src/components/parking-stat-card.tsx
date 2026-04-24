import { Card, CardContent } from "@/components/ui/card"
import { parkingSlotsData } from "@/mocks/parking-slots.data"

type Props = {
    vertical?: boolean
}

export function ParkingStatsCards({ vertical }: Props) {
    const slots = parkingSlotsData

    const available = slots.filter(s => s.status === "available").length
    const occupied = slots.filter(s => s.status === "occupied").length
    const reserved = slots.filter(s => s.status === "reserved").length
    const total = slots.length

    const stats = [
        { label: "Total", value: total, color: "text-primary" },
        { label: "Available", value: available, color: "text-green-600" },
        { label: "Occupied", value: occupied, color: "text-red-500" },
        { label: "Reserved", value: reserved, color: "text-orange-500" },
    ]

    if (vertical) {
        return (
            <div className="flex flex-col gap-2">
                {stats.map(stat => (
                    <Card key={stat.label} size="sm">
                        <CardContent className="px-3 py-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                                {stat.label}
                            </span>
                            <span className={`text-base font-bold ${stat.color}`}>
                                {stat.value}
                            </span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-4 gap-4">
            {stats.map(stat => (
                <Card key={stat.label}>
                    <CardContent className="py-3 flex flex-col gap-1">
                        <span className="text-xs uppercase text-muted-foreground">
                            {stat.label}
                        </span>
                        <span className={`text-2xl font-bold ${stat.color}`}>
                            {stat.value}
                        </span>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}