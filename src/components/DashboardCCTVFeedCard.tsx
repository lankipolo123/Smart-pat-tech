// components/DashboardCCTVFeedCard.tsx
import { RefreshCw, Camera, ChevronDown, PenLine, Trash2, Check, Maximize2, Minimize2, Pause, Play } from "lucide-react"
import {
    Card, CardHeader, CardTitle, CardDescription,
    CardContent, CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useRef, useState, useEffect, useCallback } from "react"
import { pauseCameraFeed, resumeCameraFeed, type Camera as CameraDevice } from "@/services/camera"

export type CCTVStatus = "connecting" | "live" | "disconnected"

const statusConfig: Record<CCTVStatus, { label: string; pill: string; message: string }> = {
    connecting: {
        label: "CONNECTING",
        pill: "bg-blue-500/15 text-blue-600 border border-blue-400/40",
        message: "Connecting to camera...",
    },
    live: {
        label: "LIVE",
        pill: "bg-green-500/15 text-green-600 border border-green-400/40",
        message: "",
    },
    disconnected: {
        label: "DISCONNECTED",
        pill: "bg-red-500/15 text-red-600 border border-red-400/40",
        message: "Camera disconnected. Reconnecting...",
    },
}

type Point = [number, number]

type DetectionBox = {
    x: number
    y: number
    width: number
    height: number
    label?: string
    confidence?: number
}

type Props = {
    detections?: number
    parkingSlots?: number
    title?: string
    description?: string
    onRefresh?: () => void
    onZoneDrawn?: (points: Point[], slotName: string) => void | Promise<boolean | void>
    activeCamera?: string | null
    activeCameraId?: number | null
    cameras?: CameraDevice[]
    onCameraSwitch?: (cameraId: number) => void
    connectionState?: CCTVStatus
    connectionMessage?: string | null
}

export function DashboardCCTVFeedCard({
    detections = 0,
    parkingSlots = 0,
    title,
    description,
    onRefresh,
    onZoneDrawn,
    activeCamera,
    activeCameraId,
    cameras = [],
    onCameraSwitch,
    connectionState,
    connectionMessage,
}: Props) {
    const [wsStatus, setWsStatus] = useState<CCTVStatus>("connecting")
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [drawing, setDrawing] = useState(false)
    const [points, setPoints] = useState<Point[]>([])
    const [isPaused, setIsPaused] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [detectionBoxes, setDetectionBoxes] = useState<DetectionBox[]>([])

    const wsRef = useRef<WebSocket | null>(null)
    const detectionsWsRef = useRef<WebSocket | null>(null)
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const detectionsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retryDelayRef = useRef(1_000)
    const detectionsRetryDelayRef = useRef(1_000)
    const blobUrlRef = useRef<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedRef = useRef(false)
    const slotCounterRef = useRef(1)

    // ─── Derive display status: WS wins when live, prop wins otherwise ───────
    const status: CCTVStatus = connectionState ?? wsStatus

    // ─── WebSocket ───────────────────────────────────────────────────────────
    const connectWs = useCallback(() => {
        if (!mountedRef.current) return

        // Clear any pending reconnect
        if (reconnectRef.current !== null) {
            clearTimeout(reconnectRef.current)
            reconnectRef.current = null
        }

        // Close existing connection cleanly
        if (wsRef.current) {
            wsRef.current.onclose = null
            wsRef.current.onerror = null
            wsRef.current.close()
            wsRef.current = null
        }

        setWsStatus("connecting")

        const ws = new WebSocket("ws://localhost:8000/ws/video")
        ws.binaryType = "blob"
        wsRef.current = ws

        ws.onopen = () => {
            if (!mountedRef.current) { ws.close(); return }
            setWsStatus("live")
            retryDelayRef.current = 1_000
        }

        ws.onmessage = (event) => {
            if (!mountedRef.current) return
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
            const url = URL.createObjectURL(event.data as Blob)
            blobUrlRef.current = url
            setImageSrc(url)
        }

        ws.onerror = () => {
            if (!mountedRef.current) return
            setWsStatus("disconnected")
        }

        ws.onclose = () => {
            if (!mountedRef.current) return
            setWsStatus("disconnected")
            // Exponential backoff: 1s → 2s → 4s → … → 30s max
            const delay = retryDelayRef.current
            retryDelayRef.current = Math.min(delay * 2, 30_000)
            reconnectRef.current = setTimeout(connectWs, delay)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // ← empty deps: connectWs is stable for the lifetime of the component

    const connectDetectionsWs = useCallback(() => {
        if (!mountedRef.current) return

        if (detectionsReconnectRef.current !== null) {
            clearTimeout(detectionsReconnectRef.current)
            detectionsReconnectRef.current = null
        }

        if (detectionsWsRef.current) {
            detectionsWsRef.current.onclose = null
            detectionsWsRef.current.onerror = null
            detectionsWsRef.current.close()
            detectionsWsRef.current = null
        }

        const ws = new WebSocket("ws://localhost:8000/ws/detections")
        detectionsWsRef.current = ws

        ws.onopen = () => {
            if (!mountedRef.current) { ws.close(); return }
            detectionsRetryDelayRef.current = 1_000
        }

        ws.onmessage = (event) => {
            if (!mountedRef.current) return
            try {
                const boxes = JSON.parse(event.data) as DetectionBox[]
                setDetectionBoxes(Array.isArray(boxes) ? boxes : [])
            } catch {
                setDetectionBoxes([])
            }
        }

        ws.onerror = () => {
            if (!mountedRef.current) return
            setDetectionBoxes([])
        }

        ws.onclose = () => {
            if (!mountedRef.current) return
            const delay = detectionsRetryDelayRef.current
            detectionsRetryDelayRef.current = Math.min(delay * 2, 30_000)
            detectionsReconnectRef.current = setTimeout(connectDetectionsWs, delay)
        }
    }, [])

    useEffect(() => {
        mountedRef.current = true
        connectWs()
        connectDetectionsWs()
        return () => {
            mountedRef.current = false
            if (reconnectRef.current !== null) clearTimeout(reconnectRef.current)
            if (detectionsReconnectRef.current !== null) clearTimeout(detectionsReconnectRef.current)
            if (wsRef.current) {
                wsRef.current.onclose = null
                wsRef.current.onerror = null
                wsRef.current.close()
            }
            if (detectionsWsRef.current) {
                detectionsWsRef.current.onclose = null
                detectionsWsRef.current.onerror = null
                detectionsWsRef.current.close()
            }
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        }
    }, [connectWs, connectDetectionsWs])

    // ─── Canvas drawing ──────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const { width, height } = container.getBoundingClientRect()
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, width, height)
        if (points.length === 0) return

        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.stroke()

        if (points.length >= 3) {
            ctx.fillStyle = "rgba(34,197,94,0.15)"
            ctx.fill()
        }

        ctx.setLineDash([])
        for (const [px, py] of points) {
            ctx.beginPath()
            ctx.arc(px, py, 5, 0, Math.PI * 2)
            ctx.fillStyle = "#22c55e"
            ctx.fill()
        }

        if (points.length >= 3) {
            ctx.beginPath()
            ctx.arc(points[0][0], points[0][1], 8, 0, Math.PI * 2)
            ctx.strokeStyle = "rgba(255,255,255,0.7)"
            ctx.lineWidth = 1.5
            ctx.stroke()
        }
    }, [points, drawing, isExpanded])

    // ─── Mouse handlers ──────────────────────────────────────────────────────
    const getCanvasPoint = (e: React.MouseEvent): Point => {
        const rect = canvasRef.current!.getBoundingClientRect()
        return [e.clientX - rect.left, e.clientY - rect.top]
    }

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!drawing) return
        const pt = getCanvasPoint(e)
        if (points.length >= 3) {
            const [fx, fy] = points[0]
            if (Math.hypot(pt[0] - fx, pt[1] - fy) < 12) { finishPolygon(); return }
        }
        setPoints(prev => [...prev, pt])
    }

    const pauseFeed = useCallback(async () => {
        try {
            await pauseCameraFeed()
            setIsPaused(true)
        } catch (error) {
            console.error("Failed to pause camera feed:", error)
        }
    }, [])

    const resumeFeed = useCallback(async () => {
        try {
            await resumeCameraFeed()
        } catch (error) {
            console.error("Failed to resume camera feed:", error)
        } finally {
            setIsPaused(false)
        }
    }, [])

    const startDrawing = async () => {
        if (!activeCameraId) return
        setDrawing(true)
        setPoints([])
        await pauseFeed()
    }

    const finishPolygon = async () => {
        if (points.length < 3) return
        const canvas = canvasRef.current
        if (!canvas) return
        const rounded: Point[] = points.map(([x, y]) => [
            Number((x / canvas.width).toFixed(4)),
            Number((y / canvas.height).toFixed(4)),
        ])
        const slotName = `S${slotCounterRef.current.toString().padStart(4, "0")}`
        slotCounterRef.current += 1
        await onZoneDrawn?.(rounded, slotName)
        await cancelDrawing()
    }

    const cancelDrawing = async () => {
        setDrawing(false)
        setPoints([])
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx && canvasRef.current)
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        if (isPaused) await resumeFeed()
    }

    const handlePauseToggle = async () => {
        if (isPaused) {
            await resumeFeed()
        } else {
            await pauseFeed()
        }
    }

    const handleCameraSelect = async (cameraId: number) => {
        setDrawing(false)
        setPoints([])
        if (isPaused) await resumeFeed()
        onCameraSwitch?.(cameraId)
    }

    const handleRefresh = () => {
        retryDelayRef.current = 1_000
        connectWs()
        onRefresh?.()
    }

    const cfg = statusConfig[status]
    const activeLabel = activeCamera ?? "No Camera"

    return (
        <Card
            className={cn(
                "w-full",
                isExpanded && "fixed inset-4 z-50 overflow-auto shadow-2xl",
            )}
        >
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle>{title ?? "Live CCTV Feed"}</CardTitle>
                        <CardDescription>{description ?? "Real-time parking detection"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {cameras.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={() => (
                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                                            <Camera className="size-3.5" />
                                            {activeLabel}
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    )}
                                />
                                <DropdownMenuContent align="end" className="w-56">
                                    {cameras.map((camera) => (
                                        <DropdownMenuItem
                                            key={camera.id}
                                            onClick={() => handleCameraSelect(camera.id)}
                                            className={cn(
                                                activeCameraId === camera.id && "bg-accent",
                                            )}
                                        >
                                            <Camera className="size-3.5 mr-2" />
                                            {camera.name || `Camera ${camera.id}`}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border w-fit mt-1",
                            cfg.pill,
                        )}>
                            {cfg.label}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div
                    ref={containerRef}
                    className={cn(
                        "relative w-full aspect-video bg-black rounded-lg overflow-hidden",
                        isExpanded && "h-[calc(100vh-12rem)] aspect-auto",
                    )}
                >
                    {imageSrc && status === "live" ? (
                        <img
                            src={imageSrc}
                            className="w-full h-full object-fill"
                            draggable={false}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-white/50 text-sm">
                            {connectionMessage ?? cfg.message}
                        </div>
                    )}

                    {status === "live" && detectionBoxes.map((box, index) => (
                        <div
                            key={`${box.label ?? "vehicle"}-${index}-${box.x}-${box.y}`}
                            className="pointer-events-none absolute border-2 border-yellow-300 shadow-[0_0_0_1px_rgba(0,0,0,0.7)]"
                            style={{
                                left: `${box.x * 100}%`,
                                top: `${box.y * 100}%`,
                                width: `${box.width * 100}%`,
                                height: `${box.height * 100}%`,
                            }}
                        >
                            <div className="absolute -top-6 left-0 rounded-sm bg-yellow-300 px-1.5 py-0.5 text-[10px] font-medium text-black shadow">
                                {box.label ?? "vehicle"}
                                {typeof box.confidence === "number"
                                    ? ` ${Math.round(box.confidence * 100)}%`
                                    : ""}
                            </div>
                        </div>
                    ))}

                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        onMouseMove={(e) => { if (drawing) getCanvasPoint(e) }}
                        className={cn(
                            "absolute inset-0 w-full h-full",
                            drawing ? "cursor-crosshair" : "pointer-events-none",
                        )}
                    />

                    {drawing && (
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                            DRAWING ZONE
                            <span className="text-green-600 font-medium ml-1">{points.length} pts</span>
                        </div>
                    )}
                    {isPaused && !drawing && (
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                            PAUSED
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="flex justify-between flex-wrap gap-2">
                <div className="text-xs text-muted-foreground">
                    {detectionBoxes.length || detections} detections • {parkingSlots} slots
                </div>

                <div className="flex gap-2 flex-wrap">
                    {drawing ? (
                        <>
                            <Button size="sm" variant="outline" onClick={cancelDrawing}>
                                <Trash2 className="size-4" /> Cancel
                            </Button>
                            <Button size="sm" disabled={points.length < 3} onClick={finishPolygon}>
                                <Check className="size-4" /> Save Zone
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" variant="outline" onClick={handlePauseToggle}>
                                {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                                {isPaused ? "Resume" : "Pause"}
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => setIsExpanded((value) => !value)}>
                                {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                                {isExpanded ? "Close Zoom" : "Full Zoom"}
                            </Button>

                            <Button size="sm" variant="outline" onClick={startDrawing} disabled={!activeCameraId}>
                                <PenLine className="size-4" /> Draw Zone
                            </Button>

                            <Button size="sm" onClick={handleRefresh}>
                                <RefreshCw className="size-4" /> Refresh
                            </Button>
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}
