import { useState, useEffect, useRef } from "react"
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon, TableIcon, Loader2Icon } from "lucide-react"
import {
    Dialog, DialogContent, DialogHeader, DialogFooter,
    DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { fetchSessions, type SessionRecord } from "@/services/parking"
import { convertToCSV, downloadCSV, generateCSVFilename } from "@/utils/csv-export-utils"
import { exportSessionsToExcel } from "@/utils/excel-export-utils"
import { exportSessionsToPDF, getPDFPreviewUrl } from "@/utils/pdf-export-utils"

type Format = "excel" | "pdf" | "csv"

type Props = {
    range: string
}

export function ExportDialog({ range }: Props) {
    const [open, setOpen] = useState(false)
    const [format, setFormat] = useState<Format>("excel")
    const [loading, setLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const prevUrlRef = useRef<string | null>(null)

    // Revoke previous blob URL on cleanup
    useEffect(() => {
        return () => {
            if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
        }
    }, [])

    // Generate PDF preview whenever dialog opens on PDF tab
    useEffect(() => {
        if (!open || format !== "pdf") return
        let cancelled = false
        setPreviewUrl(null)
        setPreviewLoading(true)

        fetchSessions(range).then(sessions => {
            if (cancelled || sessions.length === 0) {
                if (!cancelled) setPreviewLoading(false)
                return
            }
            return getPDFPreviewUrl(sessions, range)
        }).then(url => {
            if (cancelled) return
            if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
            prevUrlRef.current = url ?? null
            setPreviewUrl(url ?? null)
            setPreviewLoading(false)
        }).catch(() => {
            if (!cancelled) setPreviewLoading(false)
        })

        return () => { cancelled = true }
    }, [open, format, range])

    async function handleExport() {
        setLoading(true)
        try {
            const sessions: SessionRecord[] = await fetchSessions(range)
            if (sessions.length === 0) {
                setLoading(false)
                return
            }
            if (format === "excel") {
                await exportSessionsToExcel(sessions, range)
            } else if (format === "pdf") {
                await exportSessionsToPDF(sessions, range)
            } else {
                const csv = convertToCSV(sessions)
                downloadCSV(csv, generateCSVFilename(range))
            }
            setOpen(false)
        } catch (err) {
            console.error("Export failed:", err)
        } finally {
            setLoading(false)
        }
    }

    const tabs: { key: Format; label: string; icon: React.ReactNode }[] = [
        { key: "excel", label: "Excel", icon: <FileSpreadsheetIcon className="h-4 w-4" /> },
        { key: "pdf",   label: "PDF",   icon: <FileTextIcon        className="h-4 w-4" /> },
        { key: "csv",   label: "CSV",   icon: <TableIcon           className="h-4 w-4" /> },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" size="sm" className="gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    Export
                </Button>
            } />

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Export Sessions</DialogTitle>
                    <DialogDescription>
                        Download parking session data for the <strong>{range}</strong> range.
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

                {/* PDF preview */}
                {format === "pdf" && (
                    <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: 260 }}>
                        {previewLoading ? (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Generating preview…
                            </div>
                        ) : previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="h-full w-full"
                                title="PDF preview"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                No data available for preview
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter showCloseButton>
                    <Button onClick={handleExport} disabled={loading} className="gap-2">
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
