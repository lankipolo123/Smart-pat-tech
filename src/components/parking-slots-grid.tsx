import { useEffect, useState } from "react"
import { ParkingSlotCard } from "@/components/parking-slot"
import { fetchSlots, type ParkingSlot } from "@/services/parking"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const LEGEND = [
    { label: "Available", dot: "bg-green-500" },
    { label: "Occupied",  dot: "bg-destructive" },
    { label: "Reserved",  dot: "bg-orange-400" },
]

type Props = { compact?: boolean }

export function ParkingSlotsGrid({ compact }: Props) {
    const [slots, setSlots] = useState<ParkingSlot[]>([])

    useEffect(() => { fetchSlots().then(setSlots) }, [])

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                        <CardTitle className={compact ? "text-sm" : undefined}>Parking Slots</CardTitle>
                        {!compact && (
                            <CardDescription>Real-time slot status from CCTV detection</CardDescription>
                        )}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {LEGEND.map(l => (
                            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className={`size-2 rounded-full ${l.dot}`} />
                                {l.label}
                            </div>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className={compact ? "overflow-y-auto max-h-[420px] pr-1" : ""}>
                    <div className={compact ? "grid grid-cols-2 gap-1.5" : "grid grid-cols-5 gap-3"}>
                        {slots.map(slot => (
                            <ParkingSlotCard key={slot.id} slot={slot} compact={compact} />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
