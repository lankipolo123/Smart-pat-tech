import { useState, useEffect, useRef } from "react"

import {
    DownloadIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Loader2Icon,
    ExternalLinkIcon,
    MaximizeIcon,
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

import type { ExportConfig, ExportData } from "@/utils/export-config.types"
import { generatePdfPreviewUrl, generatePdfBlob, downloadPdfBlob } from "@/utils/pdf-export-utils"
import { downloadExcelWorkbook, openHtmlInNewTab } from "@/utils/excel-export-utils"

type Format = "pdf" | "excel"

type Props<T extends ExportData> = {
    config: ExportConfig<T>
}

const PRIMARY = "#a33738"

export function ExportDialog<T extends ExportData>({ config }: Props<T>) {
    const [open, setOpen] = useState(false)
    const [format, setFormat] = useState<Format>("pdf")
    const [loading, setLoading] = useState(false)

    // data
    const [fetching, setFetching] = useState(false)
    const [data, setData] = useState<T | null>(null)

    // pdf thumbnail preview
    const [pdfLoading, setPdfLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const previewUrlRef = useRef<string | null>(null)

    // excel html preview
    const [excelHtml, setExcelHtml] = useState<string | null>(null)

    // fullscreen
    const [fullscreenOpen, setFullscreenOpen] = useState(false)
    const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null)
    const [fullscreenLoading, setFullscreenLoading] = useState(false)
    const fullscreenUrlRef = useRef<string | null>(null)

    // ── fetch data on open ────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return
        let cancelled = false
        async function load() {
            try {
                setFetching(true)
                const result = await config.fetchData()
                if (!cancelled) setData(result)
            } catch (err) {
                console.error(err)
            } finally {
                if (!cancelled) setFetching(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [open])

    // ── PDF thumbnail preview ─────────────────────────────────────────────────
    useEffect(() => {
        if (!open || format !== "pdf" || !data) return
        let active = true
        async function gen() {
            try {
                setPdfLoading(true)
                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current)
                    previewUrlRef.current = null
                }
                const doc = await config.toPdfDoc(data!)
                const url = await generatePdfPreviewUrl(doc)
                if (active) {
                    previewUrlRef.current = url
                    setPreviewUrl(url)
                }
            } catch (err) {
                console.error(err)
            } finally {
                if (active) setPdfLoading(false)
            }
        }
        gen()
        return () => { active = false }
    }, [open, format, data])

    // ── Excel HTML preview ────────────────────────────────────────────────────
    useEffect(() => {
        if (!open || format !== "excel" || !data) return
        setExcelHtml(config.toPreviewHtml(data))
    }, [open, format, data])

    // ── cleanup preview blob ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = null
            }
        }
    }, [])

    // ── cleanup fullscreen blob when closed ───────────────────────────────────
    useEffect(() => {
        if (!fullscreenOpen && fullscreenUrlRef.current) {
            URL.revokeObjectURL(fullscreenUrlRef.current)
            fullscreenUrlRef.current = null
            setFullscreenUrl(null)
        }
    }, [fullscreenOpen])

    // ── escape key closes fullscreen ──────────────────────────────────────────
    useEffect(() => {
        if (!fullscreenOpen) return
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreenOpen(false) }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [fullscreenOpen])

    // ── handlers ──────────────────────────────────────────────────────────────

    async function handleOpenFullscreen() {
        if (fullscreenLoading || !data) return
        try {
            setFullscreenLoading(true)
            const doc = await config.toPdfDoc(data)
            const blob = await generatePdfBlob(doc)
            const url = URL.createObjectURL(blob)
            fullscreenUrlRef.current = url
            setFullscreenUrl(url)
            setFullscreenOpen(true)
        } catch (err) {
            console.error(err)
        } finally {
            setFullscreenLoading(false)
        }
    }

    async function handleOpenFullExcel() {
        if (!data) return
        openHtmlInNewTab(config.toPreviewHtml(data))
    }

    function handleOpenInNewTab() {
        if (fullscreenUrl) window.open(fullscreenUrl, "_blank")
    }

    async function handleExport() {
        if (!data) return
        try {
            setLoading(true)
            const filename = config.filename(data)
            if (format === "pdf") {
                const doc = await config.toPdfDoc(data)
                const blob = await generatePdfBlob(doc)
                await downloadPdfBlob(blob, filename)
            } else {
                const workbook = await config.toExcelWorkbook(data)
                await downloadExcelWorkbook(workbook, filename)
            }
            setOpen(false)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const tabs: { key: Format; label: string; icon: React.ReactNode }[] = [
        { key: "pdf", label: "PDF", icon: <FileTextIcon className="h-4 w-4" /> },
        { key: "excel", label: "Excel", icon: <FileSpreadsheetIcon className="h-4 w-4" /> },
    ]

    return (
        <>
            {/* ── Fullscreen PDF overlay ── */}
            {fullscreenOpen && fullscreenUrl && (
                <div
                    className="fixed inset-0 z-[9999] flex flex-col"
                    style={{ background: "rgba(0,0,0,0.92)" }}
                    onClick={(e) => { if (e.target === e.currentTarget) setFullscreenOpen(false) }}
                >
                    <div
                        className="flex flex-shrink-0 items-center justify-between px-5 py-2.5"
                        style={{ background: PRIMARY }}
                    >
                        <span className="text-sm font-semibold text-white">
                            {config.label} — PDF Preview
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenInNewTab}
                                className="rounded px-3 py-1.5 text-xs font-semibold text-white transition"
                                style={{ background: "rgba(255,255,255,0.18)" }}
                            >
                                Open in New Tab
                            </button>
                            <button
                                onClick={() => setFullscreenOpen(false)}
                                className="rounded bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                            >
                                × Close
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={fullscreenUrl}
                        className="min-h-0 w-full flex-1 border-none"
                        title="Full PDF Preview"
                    />
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                    nativeButton
                    render={
                        <Button size="sm" className="gap-2 bg-primary border-3 border-secondary hover:bg-[color-mix(in_srgb,var(--primary)_80%,black)] hover:border-[color-mix(in_srgb,var(--secondary)_80%,black)]">
                            <DownloadIcon className="h-4 w-4" />
                            Export
                        </Button>
                    }
                />

                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Export</DialogTitle>
                        <DialogDescription>
                            {fetching ? "Loading data…" : `${config.label}`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Format tabs */}
                    <div className="flex gap-2">
                        {tabs.map((tab) => (
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

                    {/* ── PDF preview ── */}
                    {format === "pdf" && (
                        <div className="overflow-hidden rounded-lg border bg-white" style={{ height: 420 }}>
                            <div className="flex items-center justify-between border-b px-3 py-2">
                                <span className="text-xs text-muted-foreground">
                                    PDF Preview — click to view full
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={fullscreenLoading || fetching}
                                    onClick={handleOpenFullscreen}
                                >
                                    <ExternalLinkIcon className="mr-1 h-4 w-4" />
                                    Open Full PDF
                                </Button>
                            </div>

                            {pdfLoading || fetching ? (
                                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                    Generating PDF preview…
                                </div>
                            ) : previewUrl ? (
                                <div
                                    className="group relative h-full w-full cursor-pointer overflow-hidden"
                                    onClick={handleOpenFullscreen}
                                >
                                    <iframe
                                        src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                        title="PDF Thumbnail"
                                        tabIndex={-1}
                                        style={{
                                            width: "794px",
                                            height: "1123px",
                                            transform: "scale(0.485)",
                                            transformOrigin: "top left",
                                            border: "none",
                                            pointerEvents: "none",
                                        }}
                                    />
                                    <div className="absolute inset-0 flex items-end justify-center bg-black/0 pb-5 transition-all group-hover:bg-black/30">
                                        <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                            <MaximizeIcon className="h-3.5 w-3.5" />
                                            Click to view full preview
                                        </span>
                                    </div>
                                    {fullscreenLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <Loader2Icon className="h-6 w-6 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    Preview unavailable
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Excel preview ── */}
                    {format === "excel" && (
                        <div className="overflow-hidden rounded-lg border bg-white" style={{ height: 420 }}>
                            <div className="flex items-center justify-between border-b px-3 py-2">
                                <span className="text-xs text-muted-foreground">
                                    Excel Preview
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={fetching}
                                    onClick={handleOpenFullExcel}
                                >
                                    <ExternalLinkIcon className="mr-1 h-4 w-4" />
                                    Open Full Excel
                                </Button>
                            </div>

                            {fetching ? (
                                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                    Generating Excel preview…
                                </div>
                            ) : excelHtml ? (
                                <iframe
                                    srcDoc={excelHtml}
                                    className="h-full w-full bg-white"
                                    title="Excel preview"
                                    sandbox="allow-same-origin"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    Preview unavailable
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter showCloseButton>
                        <Button
                            onClick={handleExport}
                            disabled={loading || fetching || !data}
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
                                    Download {format.toUpperCase()}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}