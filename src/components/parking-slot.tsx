import { Car, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ParkingSlot } from "@/mocks/parking-slots.data"

type Props = {
    slot: ParkingSlot
}

const statusStyles = {
    available: {
        border: "border-green-500/60 bg-green-500/5",
        badge: "bg-green-500/15 text-green-600",
        dot: "bg-green-500",
        label: "Available",
    },
    occupied: {
        border: "border-destructive/60 bg-destructive/5",
        badge: "bg-destructive/15 text-destructive",
        dot: "bg-destructive",
        label: "Occupied",
    },
    reserved: {
        border: "border-orange-400/60 bg-orange-400/5",
        badge: "bg-orange-400/15 text-orange-600",
        dot: "bg-orange-400",
        label: "Reserved",
    },
}

export function ParkingSlotCard({ slot }: Props) {
    const styles = statusStyles[slot.status]

    return (
        <div className={cn("rounded-xl border-2 p-3 flex flex-col gap-2 transition-colors", styles.border)}>
            {/* Slot ID + status dot */}
            <div className="flex items-center justify-between">
                <span className="text-base font-bold">{slot.slot}</span>
                <span className={cn("size-2.5 rounded-full", styles.dot)} />
            </div>

            {/* Status badge */}
            <span className={cn("self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles.badge)}>
                {styles.label}
            </span>

            {/* Vehicle info */}
            {slot.plate && (
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Car className="size-3" />
                        <span>{slot.plate}</span>
                    </div>
                    {slot.since && (
                        <div className="flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>Since {slot.since}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Empty placeholder for available */}
            {slot.status === "available" && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
                    <Car className="size-3" />
                    <span>Empty</span>
                </div>
            )}
        </div>
    )
}
