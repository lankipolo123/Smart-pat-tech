import { Car, Clock, MoreHorizontal, History, Edit, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ParkingSlot } from "@/services/parking"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type Props = {
    slot: ParkingSlot
    compact?: boolean
    onClick?: () => void
    onEdit?: (slot: ParkingSlot) => void
    onViewHistory?: (slot: ParkingSlot) => void
    onToggleAlert?: (slot: ParkingSlot) => void
    showActions?: boolean
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

export function ParkingSlotCard({
    slot,
    compact,
    onClick,
    onEdit,
    onViewHistory,
    onToggleAlert,
    showActions = true
}: Props) {
    const styles = statusStyles[slot.status]

    if (compact) {
        return (
            <div
                className={cn("rounded-lg border-2 px-2 py-1.5 flex flex-col gap-1 transition-colors cursor-pointer hover:shadow-sm", styles.border)}
                onClick={onClick}
            >
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{slot.slot}</span>
                    <div className="flex items-center gap-1">
                        <span className={cn("size-1.5 rounded-full", styles.dot)} />
                        {showActions && (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={() => (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-4 h-4 w-4 p-0"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <MoreHorizontal className="size-2.5" />
                                        </Button>
                                    )}
                                />
                                <DropdownMenuContent align="end" className="w-40">
                                    {onViewHistory && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onViewHistory(slot)
                                            }}
                                        >
                                            <History className="size-3 mr-2" />
                                            History
                                        </DropdownMenuItem>
                                    )}
                                    {onEdit && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onEdit(slot)
                                            }}
                                        >
                                            <Edit className="size-3 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                    )}
                                    {onToggleAlert && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onToggleAlert(slot)
                                            }}
                                        >
                                            <Bell className="size-3 mr-2" />
                                            Alert
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <span className={cn("self-start rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide", styles.badge)}>
                    {styles.label}
                </span>
                {slot.plate && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Car className="size-2.5" />
                        <span>{slot.plate}</span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn("rounded-xl border-2 p-3 flex flex-col gap-2 transition-colors cursor-pointer hover:shadow-sm", styles.border)}
            onClick={onClick}
        >
            {/* Slot ID + status dot + actions */}
            <div className="flex items-center justify-between">
                <span className="text-base font-bold">{slot.slot}</span>
                <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", styles.dot)} />
                    {showActions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={() => (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-6"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="size-4" />
                                    </Button>
                                )}
                            />
                            <DropdownMenuContent align="end" className="w-44">
                                {onViewHistory && (
                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onViewHistory(slot)
                                        }}
                                    >
                                        <History className="size-4 mr-2" />
                                        View History
                                    </DropdownMenuItem>
                                )}
                                {onEdit && (
                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onEdit(slot)
                                        }}
                                    >
                                        <Edit className="size-4 mr-2" />
                                        Edit Slot
                                    </DropdownMenuItem>
                                )}
                                {onToggleAlert && (
                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onToggleAlert(slot)
                                        }}
                                    >
                                        <Bell className="size-4 mr-2" />
                                        Toggle Alert
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
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
