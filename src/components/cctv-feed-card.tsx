import { RefreshCw, Upload, Camera } from "lucide-react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRef, useState, useCallback, useEffect } from "react"

export type CCTVStatus = "connecting" | "live" | "disconnected"
export type CCTVSize = "compact" | "sm" | "md" | "default" | "lg"

type Props = {
    streamUrl?: string
    detections?: number
    parkingSlots?: number
    size?: CCTVSize
    title?: string
    description?: string
    onRefresh?: () => void
    onTestConnection?: () => void
    onUpload?: (file: File) => void
    onWebcam?: (index: number) => void
    onConnect?: (url: string) => void
    camerasUrl?: string
}

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

export function CCTVFeedCard({
    streamUrl,
    detections = 0,
    parkingSlots = 0,
    size = "default",
    title,
    description,
    onRefresh,
    onTestConnection,
    onUpload,
    onWebcam,
    onConnect,
    camerasUrl,
}: Props) {
    // null = no response yet (connecting), true = loaded (live), false = error (disconnected)
    const [connected, setConnected] = useState<boolean | null>(null)
    const [cctvUrl, setCctvUrl] = useState("")
    const [cameras, setCameras] = useState<{ index: number; name: string }[]>([])
    const [selectedCam, setSelectedCam] = useState(0)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!camerasUrl) return
        fetch(camerasUrl)
            .then(r => r.json())
            .then((list: { index: number; name: string }[]) => {
                if (list.length) {
                    setCameras(list)
                    setSelectedCam(list[list.length - 1].index) // default to last (usually external USB)
                }
            })
            .catch(() => {})
    }, [camerasUrl])

    const handleConnect = useCallback(() => {
        if (cctvUrl.trim()) {
            onConnect?.(cctvUrl.trim())
            setCctvUrl("")
        }
    }, [cctvUrl, onConnect])

    const derivedStatus: CCTVStatus = connected === true ? "live" : connected === false ? "disconnected" : "connecting"
    const cfg = statusConfig[derivedStatus]
    const isLive = connected === true && !!streamUrl

    const imgProps = streamUrl ? {
        onLoad: () => setConnected(true),
        onError: () => setConnected(false),
    } : {}

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onUpload?.(file)
        e.target.value = ""
    }

    const pillClass = cn(
        "inline-flex items-center w-fit self-start",
        "rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase",
        cfg.pill
    )

    // ── compact: feed only + pill overlay ───────────────────────────
    if (size === "compact") {
        return (
            <Card className="w-full ring-secondary hover:ring-secondary ring-1">
                <CardContent className="p-1.5">
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9" }}
                    >
                        {streamUrl && (
                            <img
                                src={streamUrl}
                                alt="CCTV feed"
                                className={cn("h-full w-full object-cover", !isLive && "hidden")}
                                {...imgProps}
                            />
                        )}
                        {!isLive && (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-white/40">{cfg.message}</p>
                            </div>
                        )}
                        <span className={cn("absolute top-2 right-2", pillClass)}>
                            {cfg.label}
                        </span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // ── sm: title + pill + feed + upload ────────────────────────────
    if (size === "sm") {
        return (
            <Card className="w-[90%] mx-auto ring-secondary hover:ring-secondary ring-1">
                <CardHeader className="flex flex-col gap-1 py-3">
                    <CardTitle className="text-sm">{title ?? "Demo Inference"}</CardTitle>
                    {description && <CardDescription className="text-xs">{description}</CardDescription>}
                    <span className={pillClass}>{cfg.label}</span>
                </CardHeader>

                <CardContent className="py-2">
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9" }}
                    >
                        {streamUrl && (
                            <img
                                src={streamUrl}
                                alt="Demo feed"
                                className={cn("h-full w-full object-cover", !isLive && "hidden")}
                                {...imgProps}
                            />
                        )}
                        {!isLive && (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-xs text-white/40">{cfg.message}</p>
                            </div>
                        )}
                    </div>
                </CardContent>

                {onUpload && (
                    <CardFooter className="justify-end pt-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="video/mp4"
                            className="hidden"
                            onChange={handleFile}
                        />
                        <Button size="sm" onClick={() => fileRef.current?.click()}>
                            <Upload className="size-3.5" />
                            Upload MP4
                        </Button>
                    </CardFooter>
                )}
            </Card>
        )
    }

    // ── md: balanced mode with refresh + upload ──────────────────────
    if (size === "md") {
        return (
            <Card className="w-[95%] mx-auto ring-secondary hover:ring-secondary ring-1">
                <CardHeader className="flex flex-col gap-1 py-3">
                    <CardTitle className="text-base">{title ?? "Live CCTV monitoring"}</CardTitle>
                    <CardDescription className="text-sm">
                        {description ?? "Direct camera feed from your CCTV source."}
                    </CardDescription>
                    <span className={pillClass}>{cfg.label}</span>
                </CardHeader>

                <CardContent className="py-2">
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9", maxHeight: "240px" }}
                    >
                        {streamUrl && (
                            <img
                                src={streamUrl}
                                alt="CCTV feed"
                                className={cn("h-full w-full object-cover", !isLive && "hidden")}
                                {...imgProps}
                            />
                        )}
                        {!isLive && (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-white/40">{cfg.message}</p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                    {onConnect && (
                        <div className="flex w-full items-center gap-2">
                            <input
                                type="text"
                                placeholder="rtsp://... or http://..."
                                value={cctvUrl}
                                onChange={e => setCctvUrl(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleConnect()}
                                className="flex-1 h-8 rounded-md border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <Button size="sm" disabled={!cctvUrl.trim()} onClick={handleConnect}>
                                Connect CCTV
                            </Button>
                        </div>
                    )}
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="flex gap-4 text-xs text-muted-foreground">
                            <span><span className="text-destructive font-medium">{detections}</span> detections</span>
                            <span><span className="text-destructive font-medium">{parkingSlots}</span> parking slots</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {onUpload && (
                                <>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="video/mp4"
                                        className="hidden"
                                        onChange={handleFile}
                                    />
                                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                                        <Upload className="size-3.5" />
                                        Upload MP4
                                    </Button>
                                </>
                            )}
                            {onWebcam && (
                                <Button size="sm" variant="outline" onClick={onWebcam}>
                                    <Camera className="size-3.5" />
                                    Use Webcam
                                </Button>
                            )}
                            {onRefresh && (
                                <Button size="sm" onClick={onRefresh}>
                                    <RefreshCw className="size-3.5" />
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>
                </CardFooter>
            </Card>
        )
    }

    // ── lg: full-screen operator view ────────────────────────────────
    if (size === "lg") {
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
                        {streamUrl && (
                            <img
                                src={streamUrl}
                                alt="CCTV live feed"
                                className={cn("h-full w-full object-cover", !isLive && "hidden")}
                                {...imgProps}
                            />
                        )}
                        {!isLive && (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-white/40">{cfg.message}</p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                    {onConnect && (
                        <div className="flex w-full items-center gap-2">
                            <input
                                type="text"
                                placeholder="rtsp://... or http://..."
                                value={cctvUrl}
                                onChange={e => setCctvUrl(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleConnect()}
                                className="flex-1 h-8 rounded-md border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <Button size="sm" disabled={!cctvUrl.trim()} onClick={handleConnect}>
                                Connect CCTV
                            </Button>
                        </div>
                    )}
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground">
                            <span className="text-destructive font-medium">{detections}</span> detections •{" "}
                            <span className="text-destructive font-medium">{parkingSlots}</span> slots
                        </div>
                        <div className="flex items-center gap-2">
                            {onUpload && (
                                <>
                                    <input ref={fileRef} type="file" accept="video/mp4" className="hidden" onChange={handleFile} />
                                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                                        <Upload className="size-3.5" />
                                        Upload MP4
                                    </Button>
                                </>
                            )}
                            {onWebcam && (
                                <Button size="sm" variant="outline" onClick={onWebcam}>
                                    <Camera className="size-3.5" />
                                    Use Webcam
                                </Button>
                            )}
                            {onRefresh && (
                                <Button size="sm" onClick={onRefresh}>
                                    <RefreshCw className="size-3.5" />
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>
                </CardFooter>
            </Card>
        )
    }

    // ── default: full card ───────────────────────────────────────────
    return (
        <Card className="w-full ring-secondary hover:ring-secondary ring-1">
            <CardHeader className="flex flex-col gap-1">
                <CardTitle>{title ?? "Live CCTV monitoring"}</CardTitle>
                <CardDescription>
                    {description ?? "Direct camera feed from your CCTV source."}
                </CardDescription>
                <span className={pillClass}>{cfg.label}</span>
            </CardHeader>

            <CardContent>
                <div
                    className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                    style={{ aspectRatio: "16/9" }}
                >
                    {streamUrl && (
                        <img
                            src={streamUrl}
                            alt="CCTV live feed"
                            className={cn("h-full w-full object-cover", !isLive && "hidden")}
                            {...imgProps}
                        />
                    )}
                    {!isLive && (
                        <div className="flex h-full w-full items-center justify-center">
                            <p className="text-sm text-white/40">{cfg.message}</p>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                {onConnect && (
                    <div className="flex w-full items-center gap-2">
                        <input
                            type="text"
                            placeholder="rtsp://... or http://..."
                            value={cctvUrl}
                            onChange={e => setCctvUrl(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleConnect()}
                            className="flex-1 h-8 rounded-md border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <Button size="sm" disabled={!cctvUrl.trim()} onClick={handleConnect}>
                            Connect CCTV
                        </Button>
                    </div>
                )}
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <span><span className="text-destructive font-medium">{detections}</span> detections</span>
                        <span><span className="text-destructive font-medium">{parkingSlots}</span> parking slots</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onUpload && (
                            <>
                                <input ref={fileRef} type="file" accept="video/mp4" className="hidden" onChange={handleFile} />
                                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                                    <Upload className="size-3.5" />
                                    Upload MP4
                                </Button>
                            </>
                        )}
                        {onWebcam && (
                            <div className="flex items-center gap-1.5">
                                {cameras.length > 1 && (
                                    <select
                                        value={selectedCam}
                                        onChange={e => setSelectedCam(Number(e.target.value))}
                                        className="h-8 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        {cameras.map(c => (
                                            <option key={c.index} value={c.index}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                                <Button size="sm" variant="outline" onClick={() => onWebcam(selectedCam)}>
                                    <Camera className="size-3.5" />
                                    Use Webcam
                                </Button>
                            </div>
                        )}
                        {onRefresh && (
                            <Button size="sm" onClick={onRefresh}>
                                <RefreshCw className="size-3.5" />
                                Refresh live feed
                            </Button>
                        )}
                        {onTestConnection && (
                            <button
                                onClick={onTestConnection}
                                className="text-xs text-muted-foreground underline-offset-4 hover:underline cursor-pointer"
                            >
                                Test camera connection
                            </button>
                        )}
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}
