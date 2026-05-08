// components/zones-table.tsx
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Trash2, Clock, MoreHorizontal, Edit, Eye, Play, Pause } from "lucide-react"
import type { Zone } from "@/services/camera"

type Props = {
    zones: Zone[]
    highlightedId: number | undefined
    onDelete: (id?: number) => void
    onHighlight: (zone: Zone) => void
    onEdit?: (zone: Zone) => void
    onToggleMonitoring?: (zone: Zone) => void
}

function formatTime(iso: string | null | undefined) {
    if (!iso) return "—"
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function ZonesTable({ zones, highlightedId, onDelete, onHighlight, onEdit, onToggleMonitoring }: Props) {
    if (zones.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <span className="text-2xl">🅿️</span>
                No zones configured yet. Draw one on the canvas above.
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>
                        <span className="flex items-center gap-1">
                            <Clock className="size-3" /> Entry Time
                        </span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {zones.map((z, i) => (
                    <TableRow
                        key={z.id ?? i}
                        className={`cursor-pointer ${z.id === highlightedId ? "bg-muted/80" : ""}`}
                        onClick={() => onHighlight(z)}
                    >
                        <TableCell className="text-muted-foreground text-xs">{z.id ?? "—"}</TableCell>

                        <TableCell className="font-medium">{z.slot}</TableCell>

                        <TableCell>
                            {z.occupied ? (
                                <Badge variant="destructive" className="text-[10px]">OCCUPIED</Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">FREE</Badge>
                            )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                            {z.points.length} pts
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                            {formatTime(z.entry_time)}
                        </TableCell>

                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={() => (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-7"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <MoreHorizontal className="size-3.5" />
                                        </Button>
                                    )}
                                />
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onHighlight(z)
                                        }}
                                    >
                                        <Eye className="size-4 mr-2" />
                                        Highlight on Canvas
                                    </DropdownMenuItem>

                                    {onEdit && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onEdit(z)
                                            }}
                                        >
                                            <Edit className="size-4 mr-2" />
                                            Edit Zone
                                        </DropdownMenuItem>
                                    )}

                                    {onToggleMonitoring && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    onToggleMonitoring(z)
                                                }}
                                            >
                                                {z.occupied ? (
                                                    <>
                                                        <Pause className="size-4 mr-2" />
                                                        Pause Monitoring
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="size-4 mr-2" />
                                                        Resume Monitoring
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onDelete(z.id)
                                        }}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="size-4 mr-2" />
                                        Delete Zone
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}