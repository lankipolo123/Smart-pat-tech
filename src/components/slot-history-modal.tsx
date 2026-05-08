import { useEffect, useState } from "react"
import { Download, Calendar, Clock, DollarSign } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Session = {
    id: number
    slot: string
    entry: string
    exit: string | null
    duration_min: number | null
    bill: number | null
}

export function SlotHistoryModal({
    slot,
    open,
    onClose
}: {
    slot: string | null
    open: boolean
    onClose: () => void
}) {

    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!slot || !open) return

        setLoading(true)
        fetch(`http://localhost:8000/parking/sessions?range=all`)
            .then(res => res.json())
            .then(data => {
                setSessions(data.filter((s: Session) => s.slot === slot))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [slot, open])

    const exportToCSV = () => {
        if (!sessions.length) return

        const headers = ["ID", "Slot", "Entry", "Exit", "Duration (min)", "Bill (€)"]
        const csvContent = [
            headers.join(","),
            ...sessions.map(s =>
                [s.id, s.slot, s.entry, s.exit || "Active", s.duration_min || 0, s.bill || 0].join(",")
            )
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `slot-${slot}-history.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const totalRevenue = sessions.reduce((sum, s) => sum + (s.bill || 0), 0)
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_min || 0), 0)
    const activeSession = sessions.find(s => !s.exit)

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">

                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <DialogTitle className="text-lg">Slot History - {slot}</DialogTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={exportToCSV}
                        disabled={!sessions.length}
                    >
                        <Download className="size-4 mr-2" />
                        Export CSV
                    </Button>
                </DialogHeader>

                {/* Summary Stats */}
                {sessions.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 pb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
                            <div className="text-xs text-muted-foreground">Total Sessions</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">€{totalRevenue.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">Total Revenue</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{Math.round(totalDuration / sessions.length)} min</div>
                            <div className="text-xs text-muted-foreground">Avg Duration</div>
                        </div>
                    </div>
                )}

                {/* Active Session Alert */}
                {activeSession && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                            <Clock className="size-4" />
                            <span className="text-sm font-medium">Active Session in Progress</span>
                        </div>
                        <div className="text-xs text-yellow-700 mt-1">
                            Entry: {activeSession.entry} | Duration: {activeSession.duration_min || 0} min
                        </div>
                    </div>
                )}

                {/* Sessions Table */}
                <div className="max-h-[400px] overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            Loading history...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Calendar className="size-8 mb-2 opacity-50" />
                            <p>No parking sessions found for this slot.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>Entry</TableHead>
                                    <TableHead>Exit</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                    <TableHead className="text-right">Bill</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell className="text-xs font-mono">#{s.id}</TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="size-3" />
                                                {new Date(s.entry).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {s.exit ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="size-3" />
                                                    {new Date(s.exit).toLocaleString()}
                                                </div>
                                            ) : (
                                                <span className="text-yellow-600">Still Active</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                            <div className="flex items-center gap-1 justify-end">
                                                <Clock className="size-3" />
                                                {s.duration_min || 0} min
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-medium">
                                            <div className="flex items-center gap-1 justify-end">
                                                <DollarSign className="size-3" />
                                                €{(s.bill || 0).toFixed(2)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {s.exit ? (
                                                <Badge variant="default" className="text-[10px] bg-green-500">
                                                    Completed
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                                                    Active
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

            </DialogContent>
        </Dialog>
    )
}
