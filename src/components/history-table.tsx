import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table, TableHeader, TableBody, TableHead,
    TableRow, TableCell,
} from "@/components/ui/table"
import { fetchSessions, type SessionRecord } from "@/services/parking"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = { range: ParkingRange }

function formatDuration(min: number | null) {
    if (min === null) return "—"
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDateTime(ts: string | null) {
    if (!ts) return "—"
    try {
        return new Date(ts).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        })
    } catch { return ts }
}

function StatusBadge({ session }: { session: SessionRecord }) {
    if (session.exit === null)
        return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">Active</span>
    return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Done</span>
}

export function HistoryTable({ range }: Props) {
    const [sessions, setSessions] = useState<SessionRecord[]>([])

    useEffect(() => { fetchSessions(range).then(setSessions) }, [range])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Session Logs</CardTitle>
                <CardDescription>Slot entry, exit, duration, and billing records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 text-xs uppercase tracking-wider">
                            <TableHead className="px-4">Slot</TableHead>
                            <TableHead className="px-4">Entry</TableHead>
                            <TableHead className="px-4">Exit</TableHead>
                            <TableHead className="px-4">Duration</TableHead>
                            <TableHead className="px-4">Bill</TableHead>
                            <TableHead className="px-4">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    No sessions recorded for this period.
                                </TableCell>
                            </TableRow>
                        ) : sessions.map((s, i) => (
                            <TableRow key={s.id} className={i % 2 !== 0 ? "bg-muted/10" : ""}>
                                <TableCell className="px-4 font-medium">{s.slot}</TableCell>
                                <TableCell className="px-4 text-muted-foreground">{formatDateTime(s.entry)}</TableCell>
                                <TableCell className="px-4 text-muted-foreground">{formatDateTime(s.exit)}</TableCell>
                                <TableCell className="px-4">{formatDuration(s.durationMin)}</TableCell>
                                <TableCell className="px-4 font-medium text-primary">
                                    {s.bill !== null ? `₱${s.bill.toFixed(2)}` : "—"}
                                </TableCell>
                                <TableCell className="px-4"><StatusBadge session={s} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
