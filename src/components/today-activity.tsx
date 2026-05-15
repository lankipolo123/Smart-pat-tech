import { useEffect, useState } from "react"
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import {
    Table, TableHeader, TableBody, TableHead,
    TableRow, TableCell,
} from "@/components/ui/table"
import { fetchSessions, type SessionRecord } from "@/services/parking"
import { formatDateTime } from "@/utils/table-utils"
import { StatusBadge } from "@/components/status-badge"
import { ReceiptDialog } from "@/components/receipt-dialog"
import { mockSessions } from "@/mocks/mock-sessions"

const MAX_ROWS = 8
const POLL_INTERVAL = 15_000

export function TodayActivity() {
    const [sessions, setSessions] = useState<SessionRecord[]>(mockSessions)
    const [usingFallback, setUsingFallback] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const data = await fetchSessions("today")
                if (cancelled) return

                if (data.length > 0) {
                    setSessions(data)
                    setUsingFallback(false)
                } else {
                    setSessions(mockSessions)
                    setUsingFallback(true)
                }
            } catch (error) {
                console.warn("[today-activity] Using display fallback", error)
                if (!cancelled) {
                    setSessions(mockSessions)
                    setUsingFallback(true)
                }
            }
        }

        load()
        const id = setInterval(load, POLL_INTERVAL)
        return () => { cancelled = true; clearInterval(id) }
    }, [])

    const rows = sessions.slice(0, MAX_ROWS)

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>Today's Activity</CardTitle>
                <CardDescription>
                    Latest vehicle sessions&nbsp;
                    {sessions.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {usingFallback ? "- display sample" : `- ${sessions.length} total today`}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="text-xs uppercase tracking-wider text-primary">
                            <TableHead className="px-4">Slot</TableHead>
                            <TableHead className="px-4">Plate</TableHead>
                            <TableHead className="px-4">Entry</TableHead>
                            <TableHead className="px-4">Exit</TableHead>
                            <TableHead className="px-4">Status</TableHead>
                            <TableHead className="px-4 w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    No activity recorded today.
                                </TableCell>
                            </TableRow>
                        ) : rows.map((s, i) => (
                            <TableRow key={s.id} className={i % 2 !== 0 ? "bg-muted/10" : ""}>
                                <TableCell className="px-4 font-medium">{s.slot}</TableCell>
                                <TableCell className="px-4 font-mono text-xs tracking-wide">
                                    {s.plate ?? "—"}
                                </TableCell>
                                <TableCell className="px-4 text-muted-foreground text-xs">
                                    {formatDateTime(s.entry)}
                                </TableCell>
                                <TableCell className="px-4 text-xs">
                                    {s.exit === null
                                        ? <span className="text-green-600 font-medium">Ongoing</span>
                                        : <span className="text-muted-foreground">{formatDateTime(s.exit)}</span>}
                                </TableCell>
                                <TableCell className="px-4">
                                    <StatusBadge session={s} />
                                </TableCell>
                                <TableCell className="px-2">
                                    {/* Only show receipt trigger for completed sessions */}
                                    {s.exit !== null
                                        ? <ReceiptDialog session={s} />
                                        : <span className="inline-block size-7" />
                                    }
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {sessions.length > MAX_ROWS && (
                    <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                        Showing latest {MAX_ROWS} of {sessions.length} sessions today.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
