import { useState, useEffect } from "react"

import {
    Card, CardContent, CardHeader,
    CardTitle, CardDescription,
} from "@/components/ui/card"
import {
    Table, TableHeader, TableBody, TableHead,
    TableRow, TableCell,
} from "@/components/ui/table"
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination"

import { type SessionRecord } from "@/services/parking"
import { formatDateTime, formatDuration, buildPageNumbers } from "@/utils/table-utils"
import { StatusBadge } from "@/components/status-badge"

type Props = {
    sessions: SessionRecord[]
    loading: boolean
}

const PAGE_SIZE = 10

export function HistoryTable({ sessions, loading }: Props) {
    const [page, setPage] = useState(1)

    useEffect(() => {
        setPage(1)
    }, [sessions])

    const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
    const paginated = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const rangeStart = sessions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const rangeEnd = Math.min(page * PAGE_SIZE, sessions.length)

    function go(p: number) {
        if (p < 1 || p > totalPages) return
        setPage(p)
    }

    return (
        <Card className={`transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
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
                        <TableRow className="text-xs uppercase tracking-wider text-primary">
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
                                <TableCell className="px-4 text-muted-foreground">
                                    {s.exit === null
                                        ? <span className="text-green-600 font-medium text-xs">Ongoing</span>
                                        : formatDateTime(s.exit)}
                                </TableCell>
                                <TableCell className="px-4">
                                    {s.exit === null
                                        ? <span className="text-green-600 font-medium text-xs">Ongoing</span>
                                        : formatDuration(s.durationMin)}
                                </TableCell>
                                <TableCell className="px-4 font-medium text-primary">
                                    {s.exit === null
                                        ? <span className="text-green-600 font-medium text-xs">Ongoing</span>
                                        : s.bill !== null ? `₱${s.bill.toFixed(2)}` : "—"}
                                </TableCell>
                                <TableCell className="px-4">
                                    <StatusBadge session={s} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <div className="border-t px-4 py-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium text-foreground">{rangeStart}–{rangeEnd}</span>
                            {" "}of{" "}
                            <span className="font-medium text-foreground">{sessions.length}</span>
                            {" "}records
                        </p>

                        <Pagination className="mx-0 w-auto">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={e => { e.preventDefault(); go(page - 1) }}
                                        className={page === 1 ? "pointer-events-none opacity-50" : "text-primary"}
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
                                                className={p === page ? "text-primary-foreground" : ""}
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
                                        className={page === totalPages ? "pointer-events-none opacity-50" : "text-primary"}
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