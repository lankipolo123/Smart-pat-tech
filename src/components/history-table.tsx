import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { parkingHistoryData, type SessionRecord } from "@/mocks/parking-history.data"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = {
    range: ParkingRange
}

function formatDuration(min: number | null) {
    if (min === null) return "—"
    const h = Math.floor(min / 60)
    const m = min % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

function StatusBadge({ session }: { session: SessionRecord }) {
    if (session.exit === null) {
        return (
            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                Active
            </span>
        )
    }
    return (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Done
        </span>
    )
}

export function HistoryTable({ range }: Props) {
    const { sessions } = parkingHistoryData[range]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Session Logs</CardTitle>
                <CardDescription>Slot entry, exit, duration, and billing records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">Slot</th>
                                <th className="px-4 py-3">Plate</th>
                                <th className="px-4 py-3">Entry</th>
                                <th className="px-4 py-3">Exit</th>
                                <th className="px-4 py-3">Duration</th>
                                <th className="px-4 py-3">Bill</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No sessions recorded for this period.
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((s, i) => (
                                    <tr
                                        key={s.id}
                                        className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                                    >
                                        <td className="px-4 py-3 font-medium">{s.slot}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{s.plate}</td>
                                        <td className="px-4 py-3">{s.entry}</td>
                                        <td className="px-4 py-3">{s.exit ?? "—"}</td>
                                        <td className="px-4 py-3">{formatDuration(s.durationMin)}</td>
                                        <td className="px-4 py-3 font-medium text-primary">
                                            {s.bill !== null ? `₱${s.bill.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge session={s} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
