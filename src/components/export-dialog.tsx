import { useState, useEffect, useRef } from "react"
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon, TableIcon, Loader2Icon } from "lucide-react"
import {
    Dialog, DialogContent, DialogHeader, DialogFooter,
    DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { fetchSessions, type SessionRecord } from "@/services/parking"
import { convertToCSV, downloadCSV, generateCSVFilename, formatDate, formatDuration, formatFee, sessionLabel } from "@/utils/csv-export-utils"
import { exportSessionsToExcel } from "@/utils/excel-export-utils"
import { exportSessionsToPDF, getPDFPreviewUrl } from "@/utils/pdf-export-utils"

type Format = "excel" | "pdf" | "csv"

type Props = {
    range: string
}

const PREVIEW_ROWS = 5

export function ExportDialog({ range }: Props) {
    const [open, setOpen]               = useState(false)
    const [format, setFormat]           = useState<Format>("pdf")
    const [loading, setLoading]         = useState(false)
    const [sessions, setSessions]       = useState<SessionRecord[]>([])
    const [fetching, setFetching]       = useState(false)
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
    const [pdfLoading, setPdfLoading]   = useState(false)
    const prevUrlRef = useRef<string | null>(null)

    // Fetch sessions whenever dialog opens
    useEffect(() => {
        if (!open) return
        let cancelled = false
        setFetching(true)
        setSessions([])
        setPreviewUrl(null)

        fetchSessions(range).then(data => {
            if (cancelled) return
            setSessions(data)
            setFetching(false)
        }).catch(() => {
            if (!cancelled) setFetching(false)
        })

        return () => { cancelled = true }
    }, [open, range])

    // Generate PDF preview when on PDF tab and sessions ready
    useEffect(() => {
        if (!open || format !== "pdf" || sessions.length === 0) return
        let cancelled = false
        setPreviewUrl(null)
        setPdfLoading(true)

        getPDFPreviewUrl(sessions, range).then(url => {
            if (cancelled) return
            if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
            prevUrlRef.current = url ?? null
            setPreviewUrl(url ?? null)
            setPdfLoading(false)
        }).catch(() => {
            if (!cancelled) setPdfLoading(false)
        })

        return () => { cancelled = true }
    }, [open, format, sessions, range])

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
        }
    }, [])

    async function handleExport() {
        if (sessions.length === 0) return
        setLoading(true)
        try {
            if (format === "excel") {
                await exportSessionsToExcel(sessions, range)
            } else if (format === "pdf") {
                await exportSessionsToPDF(sessions, range)
            } else {
                downloadCSV(convertToCSV(sessions), generateCSVFilename(range))
            }
            setOpen(false)
        } catch (err) {
            console.error("Export failed:", err)
        } finally {
            setLoading(false)
        }
    }

    const tabs: { key: Format; label: string; icon: React.ReactNode }[] = [
        { key: "pdf",   label: "PDF",   icon: <FileTextIcon        className="h-4 w-4" /> },
        { key: "excel", label: "Excel", icon: <FileSpreadsheetIcon className="h-4 w-4" /> },
        { key: "csv",   label: "CSV",   icon: <TableIcon           className="h-4 w-4" /> },
    ]

    const preview = sessions.slice(0, PREVIEW_ROWS)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" size="sm" className="gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    Export
                </Button>
            } />

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Export Sessions</DialogTitle>
                    <DialogDescription>
                        Exporting <strong>{range}</strong> data · {sessions.length} records
                    </DialogDescription>
                </DialogHeader>

                {/* Format tabs */}
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFormat(tab.key)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors
                                ${format === tab.key
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* PDF iframe preview */}
                {format === "pdf" && (
                    <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: 240 }}>
                        {pdfLoading || fetching ? (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Generating PDF preview…
                            </div>
                        ) : previewUrl ? (
                            <iframe src={previewUrl} className="h-full w-full" title="PDF preview" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                {sessions.length === 0 ? "No data available" : "Preview unavailable"}
                            </div>
                        )}
                    </div>
                )}

                {/* Data table preview (Excel / CSV tabs) */}
                {format !== "pdf" && (
                    <div className="rounded-lg border overflow-hidden">
                        <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                            Preview — first {PREVIEW_ROWS} rows of {sessions.length}
                        </div>
                        {fetching ? (
                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Loading data…
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            {["Session #", "Slot", "Entry", "Exit", "Duration", "Fee", "Status"].map(h => (
                                                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                                                    No session data for this range
                                                </td>
                                            </tr>
                                        ) : (
                                            preview.map((s, i) => {
                                                const status = s.exit === null ? "Active" : "Done"
                                                return (
                                                    <tr key={s.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                                                        <td className="px-3 py-1.5 font-mono">{sessionLabel(s.id)}</td>
                                                        <td className="px-3 py-1.5">{s.slot}</td>
                                                        <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(s.entry)}</td>
                                                        <td className="px-3 py-1.5 whitespace-nowrap">{s.exit ? formatDate(s.exit) : "—"}</td>
                                                        <td className="px-3 py-1.5">{formatDuration(s.durationMin)}</td>
                                                        <td className="px-3 py-1.5">{formatFee(s.bill)}</td>
                                                        <td className="px-3 py-1.5">
                                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                status === "Active"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-gray-100 text-gray-600"
                                                            }`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter showCloseButton>
                    <Button onClick={handleExport} disabled={loading || fetching || sessions.length === 0} className="gap-2">
                        {loading ? (
                            <>
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Exporting…
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="h-4 w-4" />
                                Download {format.toUpperCase()}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
