import { RefreshCw, Camera, ChevronDown } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRef, useState, useEffect, useCallback } from "react"
import { fetchCameras, switchToWebcam, connectToUrl, type Camera as CameraDevice } from "@/services/camera"

export type CCTVStatus = "connecting" | "live" | "disconnected"

const statusConfig: Record<CCTVStatus, { label: string; pill: string; message: string }> = {
    connecting: {
        label: "CONNECTING",
        pill: "bg-blue-500/15 text-blue-600 border border-blue-400/40",
        message: "Connection closed. Reconnecting...",
    },
    live: {
        label: "LIVE",
        pill: "bg-green-500/15 text-green-600 border border-green-400/40",
        message: "",
    },
    disconnected: {
        label: "DISCONNECTED",
        pill: "bg-destructive/15 text-destructive border border-destructive/40",
        message: "Camera disconnected. Check your source.",
    },
}

type Props = {
    streamUrl?: string
    detections?: number
    parkingSlots?: number
    title?: string
    description?: string
    onRefresh?: () => void
}

export function CCTVFeedCard({
    detections = 0,
    parkingSlots = 0,
    title,
    description,
    onRefresh,
}: Props) {
    const [status, setStatus] = useState<CCTVStatus>("connecting")
    const [sourceOpen, setSourceOpen] = useState(false)
    const [cameras, setCameras] = useState<CameraDevice[]>([])
    const [activeSource, setActiveSource] = useState<string | null>(null)
    const [rtspUrl, setRtspUrl] = useState("")
    const [imageSrc, setImageSrc] = useState<string | null>(null)

    const panelRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const blobUrlRef = useRef<string | null>(null)

    const connectWs = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        setStatus("connecting")

        const ws = new WebSocket(`ws://localhost:8000/ws/video`)
        wsRef.current = ws

        ws.binaryType = "blob"

        ws.onopen = () => {
            setStatus("live")
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current)
                reconnectTimer.current = null
            }
        }

        ws.onmessage = (event) => {
            // Revoke previous blob URL to free memory
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
            }
            const url = URL.createObjectURL(event.data)
            blobUrlRef.current = url
            setImageSrc(url)
        }

        ws.onerror = () => {
            setStatus("disconnected")
        }

        ws.onclose = () => {
            setStatus("disconnected")
            // Auto-reconnect after 2s
            reconnectTimer.current = setTimeout(() => {
                connectWs()
            }, 2000)
        }
    }, [])

    // Connect on mount, cleanup on unmount
    useEffect(() => {
        connectWs()
        return () => {
            if (wsRef.current) wsRef.current.close()
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        }
    }, [connectWs])

    useEffect(() => {
        fetchCameras().then(list => {
            setCameras(list)
            if (list.length > 0) {
                setActiveSource(`cam:${list[list.length - 1].index}`)
            }
        })
    }, [])

    // Close panel when clicking outside
    useEffect(() => {
        if (!sourceOpen) return
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setSourceOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [sourceOpen])

    const handleSelectCamera = async (index: number) => {
        try { await switchToWebcam(index) } catch { }
        setActiveSource(`cam:${index}`)
        setSourceOpen(false)
        onRefresh?.()
    }

    const handleConnectRtsp = async () => {
        const url = rtspUrl.trim()
        if (!url) return
        try { await connectToUrl(url) } catch { }
        setActiveSource("rtsp")
        setRtspUrl("")
        setSourceOpen(false)
        onRefresh?.()
    }

    const handleRefresh = () => {
        connectWs()
        onRefresh?.()
    }

    const cfg = statusConfig[status]

    const pillClass = cn(
        "inline-flex items-center w-fit self-start",
        "rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase",
        cfg.pill
    )

    const activeLabel = (() => {
        if (!activeSource) return "Source"
        if (activeSource === "rtsp") return "IP / RTSP"
        const idx = parseInt(activeSource.replace("cam:", ""))
        return cameras.find(c => c.index === idx)?.name ?? "Source"
    })()

    return (
        <Card className="w-full ring-secondary hover:ring-secondary ring-1">
            <CardHeader className="flex flex-col gap-1">
                <CardTitle>{title ?? "Live CCTV monitoring"}</CardTitle>
                <CardDescription>
                    {description ?? "Full-screen operator view of parking system"}
                </CardDescription>
                <span className={pillClass}>{cfg.label}</span>
            </CardHeader>

            <CardContent>
                <div
                    className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                    style={{ aspectRatio: "16/9", minHeight: "360px" }}
                >
                    {imageSrc && status === "live" ? (
                        <img
                            src={imageSrc}
                            alt="CCTV live feed"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <p className="text-sm text-white/40">{cfg.message}</p>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                {/* Source panel */}
                {sourceOpen && (
                    <div
                        ref={panelRef}
                        className="w-full rounded-lg border border-border bg-background p-3 flex flex-col gap-3"
                    >
                        {cameras.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Available Cameras
                                </p>
                                {cameras.map(cam => (
                                    <button
                                        key={cam.index}
                                        onClick={() => handleSelectCamera(cam.index)}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-accent",
                                            activeSource === `cam:${cam.index}` && "bg-accent text-accent-foreground font-medium"
                                        )}
                                    >
                                        <Camera className="size-3.5 shrink-0 text-muted-foreground" />
                                        {cam.name}
                                    </button>
                                ))}
                                {cameras.length === 0 && (
                                    <p className="text-xs text-muted-foreground px-2">No cameras detected</p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                IP Camera / RTSP
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="rtsp://... or http://..."
                                    value={rtspUrl}
                                    onChange={e => setRtspUrl(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleConnectRtsp()}
                                    className="flex-1 h-8 rounded-md border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <Button size="sm" disabled={!rtspUrl.trim()} onClick={handleConnectRtsp}>
                                    Connect
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer controls */}
                <div className="flex w-full items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        <span className="text-destructive font-medium">{detections}</span> detections •{" "}
                        <span className="text-destructive font-medium">{parkingSlots}</span> slots
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSourceOpen(o => !o)}
                        >
                            <Camera className="size-3.5" />
                            {activeLabel}
                            <ChevronDown className={cn("size-3.5 transition-transform", sourceOpen && "rotate-180")} />
                        </Button>
                        <Button size="sm" onClick={handleRefresh}>
                            <RefreshCw className="size-3.5" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}