import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table, TableHeader, TableBody, TableHead,
    TableRow, TableCell,
} from "@/components/ui/table"
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination"
import { fetchSessions, type SessionRecord } from "@/services/parking"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = { range: ParkingRange }

const PAGE_SIZE = 10

function formatDateTime(ts: string | null) {
    if (!ts) return "—"
    try {
        return new Date(ts).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        })
    } catch { return ts }
}

function formatDuration(min: number | null) {
    if (min === null) return "—"
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function StatusBadge({ session }: { session: SessionRecord }) {
    if (session.exit === null)
        return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">Ongoing</span>
    return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Done</span>
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, "…", total]
    if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total]
    return [1, "…", current - 1, current, current + 1, "…", total]
}

export function HistoryTable({ range }: Props) {
    const [sessions, setSessions] = useState<SessionRecord[]>([])
    const [page, setPage] = useState(1)

    useEffect(() => {
        fetchSessions(range).then(setSessions)
        setPage(1)
    }, [range])

    const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
    const paginated  = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function go(p: number) {
        if (p < 1 || p > totalPages) return
        setPage(p)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Session Logs</CardTitle>
                <CardDescription>
                    Slot entry, exit, duration, and billing records
                    {sessions.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                            — {sessions.length} total
                        </span>
                    )}
                </CardDescription>
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
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    No sessions recorded for this period.
                                </TableCell>
                            </TableRow>
                        ) : paginated.map((s, i) => (
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

                {totalPages > 1 && (
                    <div className="border-t px-4 py-3">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={e => { e.preventDefault(); go(page - 1) }}
                                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>

                                {buildPageNumbers(page, totalPages).map((p, i) =>
                                    p === "…" ? (
                                        <PaginationItem key={`ellipsis-${i}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    ) : (
                                        <PaginationItem key={p}>
                                            <PaginationLink
                                                href="#"
                                                isActive={p === page}
                                                onClick={e => { e.preventDefault(); go(p as number) }}
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )
                                )}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={e => { e.preventDefault(); go(page + 1) }}
                                        className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
