import { useState, useEffect } from "react"

import {
    DownloadIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    TableIcon,
    Loader2Icon,
} from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

import {
    fetchSessions,
    type SessionRecord,
} from "@/services/parking"

import {
    convertToCSV,
    downloadCSV,
    generateCSVFilename,
    formatDate,
    formatDuration,
    formatFee,
    sessionLabel,
} from "@/utils/csv-export-utils"

import {
    exportSessionsToExcel,
} from "@/utils/excel-export-utils"

import {
    exportSessionsToPDF,
    getPDFPreviewUrl,
} from "@/utils/pdf-export-utils"

type Format = "excel" | "pdf" | "csv"

type Props = {
    range: string
}

const PREVIEW_ROWS = 5

export function ExportDialog({
    range,
}: Props) {
    const [open, setOpen] =
        useState(false)

    const [format, setFormat] =
        useState<Format>("pdf")

    const [loading, setLoading] =
        useState(false)

    const [fetching, setFetching] =
        useState(false)

    const [pdfLoading, setPdfLoading] =
        useState(false)

    const [sessions, setSessions] =
        useState<SessionRecord[]>([])

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null)

    const [
        previewGenerated,
        setPreviewGenerated,
    ] = useState(false)

    useEffect(() => {
        if (!open) return

        let cancelled = false

        async function loadSessions() {
            try {
                setFetching(true)

                const data =
                    await fetchSessions(range)

                if (cancelled) return

                setSessions(data)

                setPreviewGenerated(false)
                setPreviewUrl(null)
            } catch (err) {
                console.error(
                    "Failed to fetch sessions:",
                    err
                )
            } finally {
                if (!cancelled) {
                    setFetching(false)
                }
            }
        }

        loadSessions()

        return () => {
            cancelled = true
        }
    }, [open, range])

    useEffect(() => {
        let cancelled = false

        async function generatePreview() {
            if (!open) return

            if (format !== "pdf") return

            if (sessions.length === 0) return

            if (previewGenerated) return

            try {
                setPdfLoading(true)

                const url =
                    await getPDFPreviewUrl(
                        sessions.slice(0, 5),
                        range
                    )

                if (cancelled) return

                setPreviewUrl(url)

                setPreviewGenerated(true)
            } catch (err) {
                console.error(
                    "Preview generation failed:",
                    err
                )
            } finally {
                if (!cancelled) {
                    setPdfLoading(false)
                }
            }
        }

        generatePreview()

        return () => {
            cancelled = true
        }
    }, [
        open,
        format,
        range,
        sessions.length,
        previewGenerated,
    ])

    async function handleExport() {
        if (sessions.length === 0) return

        try {
            setLoading(true)

            if (format === "excel") {
                await exportSessionsToExcel(
                    sessions,
                    range
                )
            } else if (format === "pdf") {
                await exportSessionsToPDF(
                    sessions,
                    range
                )
            } else {
                downloadCSV(
                    convertToCSV(sessions),
                    generateCSVFilename(range)
                )
            }

            setOpen(false)
        } catch (err) {
            console.error(
                "Export failed:",
                err
            )
        } finally {
            setLoading(false)
        }
    }

    const preview = sessions.slice(
        0,
        PREVIEW_ROWS
    )

    const tabs: {
        key: Format
        label: string
        icon: React.ReactNode
    }[] = [
            {
                key: "pdf",
                label: "PDF",
                icon: (
                    <FileTextIcon className="h-4 w-4" />
                ),
            },

            {
                key: "excel",
                label: "Excel",
                icon: (
                    <FileSpreadsheetIcon className="h-4 w-4" />
                ),
            },

            {
                key: "csv",
                label: "CSV",
                icon: (
                    <TableIcon className="h-4 w-4" />
                ),
            },
        ]

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger
                nativeButton
                render={
                    <Button
                        size="sm"
                        className="gap-2 bg-primary"
                    >
                        <DownloadIcon className="h-4 w-4" />
                        Export
                    </Button>
                }
            />

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Export Sessions
                    </DialogTitle>

                    <DialogDescription>
                        Exporting{" "}
                        <strong>{range}</strong> data ·{" "}
                        {sessions.length} records
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() =>
                                setFormat(tab.key)
                            }
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

                {format === "pdf" && (
                    <div
                        className="overflow-hidden rounded-lg border bg-white"
                        style={{ height: 420 }}
                    >
                        {pdfLoading ||
                            fetching ? (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Generating PDF preview…
                            </div>
                        ) : previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="h-full w-full bg-white"
                                title="PDF preview"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Preview unavailable
                            </div>
                        )}
                    </div>
                )}

                {format !== "pdf" && (
                    <div className="overflow-hidden rounded-lg border">
                        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                            Preview — first{" "}
                            {PREVIEW_ROWS} rows of{" "}
                            {sessions.length}
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
                                            {[
                                                "Session #",
                                                "Slot",
                                                "Entry",
                                                "Exit",
                                                "Duration",
                                                "Fee",
                                                "Status",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {preview.length ===
                                            0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-3 py-6 text-center text-muted-foreground"
                                                >
                                                    No session data
                                                </td>
                                            </tr>
                                        ) : (
                                            preview.map(
                                                (s, i) => {
                                                    const status =
                                                        s.exit === null
                                                            ? "Ongoing"
                                                            : "Done"

                                                    return (
                                                        <tr
                                                            key={s.id}
                                                            className={
                                                                i % 2 === 0
                                                                    ? "bg-background"
                                                                    : "bg-muted/10"
                                                            }
                                                        >
                                                            <td className="px-3 py-1.5 font-mono">
                                                                {sessionLabel(
                                                                    s.id
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-1.5">
                                                                {s.slot}
                                                            </td>

                                                            <td className="whitespace-nowrap px-3 py-1.5">
                                                                {formatDate(
                                                                    s.entry
                                                                )}
                                                            </td>

                                                            <td className="whitespace-nowrap px-3 py-1.5">
                                                                {s.exit
                                                                    ? formatDate(
                                                                        s.exit
                                                                    )
                                                                    : "—"}
                                                            </td>

                                                            <td className="px-3 py-1.5">
                                                                {formatDuration(
                                                                    s.durationMin
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-1.5">
                                                                {formatFee(
                                                                    s.bill
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-1.5">
                                                                <span
                                                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${status ===
                                                                            "Ongoing"
                                                                            ? "bg-emerald-100 text-emerald-700"
                                                                            : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter showCloseButton>
                    <Button
                        onClick={handleExport}
                        disabled={
                            loading ||
                            fetching ||
                            sessions.length === 0
                        }
                        className="gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Exporting…
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="h-4 w-4" />
                                Download{" "}
                                {format.toUpperCase()}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}