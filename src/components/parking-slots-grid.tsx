import { ParkingSlotCard } from "@/components/parking-slot"
import { parkingSlotsData } from "@/mocks/parking-slots.data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const LEGEND = [
    { label: "Available", dot: "bg-green-500" },
    { label: "Occupied",  dot: "bg-destructive" },
    { label: "Reserved",  dot: "bg-orange-400" },
]

export function ParkingSlotsGrid() {
    const slots = parkingSlotsData

    const available = slots.filter((s) => s.status === "available").length
    const occupied  = slots.filter((s) => s.status === "occupied").length
    const reserved  = slots.filter((s) => s.status === "reserved").length
    const total     = slots.length

    return (
        <div className="flex flex-col gap-6">
            {/* Summary row */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total Slots",  value: total,     color: "text-primary" },
                    { label: "Available",    value: available, color: "text-green-600" },
                    { label: "Occupied",     value: occupied,  color: "text-destructive" },
                    { label: "Reserved",     value: reserved,  color: "text-orange-500" },
                ].map(({ label, value, color }) => (
                    <Card key={label} size="sm">
                        <CardContent className="flex flex-col gap-1 py-3">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Legend + grid */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Parking Slots</CardTitle>
                            <CardDescription>Real-time slot status from CCTV detection</CardDescription>
                        </div>
                        <div className="flex gap-4">
                            {LEGEND.map(({ label, dot }) => (
                                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className={`size-2.5 rounded-full ${dot}`} />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-5 gap-3">
                        {slots.map((slot) => (
                            <ParkingSlotCard key={slot.id} slot={slot} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
