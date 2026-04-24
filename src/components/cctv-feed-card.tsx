import { RefreshCw, Upload } from "lucide-react"
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
import { useRef } from "react"

export type CCTVStatus = "connecting" | "live" | "disconnected"
export type CCTVSize = "compact" | "sm" | "md" | "default" | "lg"

type Props = {
    status?: CCTVStatus
    streamUrl?: string
    detections?: number
    parkingSlots?: number
    size?: CCTVSize
    title?: string
    description?: string
    onRefresh?: () => void
    onUpload?: (file: File) => void
}

const statusConfig: Record<
    CCTVStatus,
    { label: string; pill: string; message: string }
> = {
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
    status = "connecting",
    streamUrl,
    detections = 0,
    parkingSlots = 0,
    size = "default",
    title,
    description,
    onRefresh,
    onUpload,
}: Props) {
    const cfg = statusConfig[status]
    const isLive = status === "live" && !!streamUrl
    const fileRef = useRef<HTMLInputElement>(null)

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

    // ─────────────────────────────
    // COMPACT
    // ─────────────────────────────
    if (size === "compact") {
        return (
            <Card className="w-full ring-secondary hover:ring-secondary ring-1">
                <CardContent className="p-1.5">
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9" }}
                    >
                        {isLive ? (
                            <img
                                src={streamUrl}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-white/40">
                                    {cfg.message}
                                </p>
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

    // ─────────────────────────────
    // SMALL
    // ─────────────────────────────
    if (size === "sm") {
        return (
            <Card className="w-[90%] mx-auto ring-secondary hover:ring-secondary ring-1">
                <CardHeader className="flex flex-col gap-1 py-3">
                    <CardTitle className="text-sm">
                        {title ?? "Demo Inference"}
                    </CardTitle>

                    {description && (
                        <CardDescription className="text-xs">
                            {description}
                        </CardDescription>
                    )}

                    <span className={pillClass}>{cfg.label}</span>
                </CardHeader>

                <CardContent className="py-2">
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9" }}
                    >
                        {isLive ? (
                            <img
                                src={streamUrl}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-xs text-white/40">
                                    {cfg.message}
                                </p>
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
                        <Button
                            size="sm"
                            onClick={() => fileRef.current?.click()}
                        >
                            <Upload className="size-3.5" />
                            Upload MP4
                        </Button>
                    </CardFooter>
                )}
            </Card>
        )
    }

    // ─────────────────────────────
    // MD (NEW BALANCED MODE)
    // ─────────────────────────────
    if (size === "md") {
        return (
            <Card className="w-[95%] mx-auto ring-secondary hover:ring-secondary ring-1">
                <CardHeader className="flex flex-col gap-1 py-3">
                    <CardTitle className="text-base">
                        {title ?? "Live CCTV monitoring"}
                    </CardTitle>

                    <CardDescription className="text-sm">
                        {description ?? "Direct camera feed from your CCTV source."}
                    </CardDescription>

                    <span className={pillClass}>{cfg.label}</span>
                </CardHeader>

                <CardContent className="py-2">
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9" }}
                    >
                        {isLive ? (
                            <img
                                src={streamUrl}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-white/40">
                                    {cfg.message}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-4">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                            <span className="text-destructive font-medium">
                                {detections}
                            </span>{" "}
                            detections
                        </span>
                        <span>
                            <span className="text-destructive font-medium">
                                {parkingSlots}
                            </span>{" "}
                            parking slots
                        </span>
                    </div>

                    {onRefresh && (
                        <Button size="sm" onClick={onRefresh}>
                            <RefreshCw className="size-3.5" />
                            Refresh
                        </Button>
                    )}
                </CardFooter>
            </Card>
        )
    }

    // ─────────────────────────────
    // LG
    // ─────────────────────────────
    if (size === "lg") {
        return (
            <Card className="w-full ring-secondary hover:ring-secondary ring-1">
                <CardHeader className="flex flex-col gap-1">
                    <CardTitle>
                        {title ?? "Live CCTV monitoring"}
                    </CardTitle>

                    <CardDescription>
                        {description ?? "Full-screen operator view of parking system"}
                    </CardDescription>

                    <span className={pillClass}>{cfg.label}</span>
                </CardHeader>

                <CardContent>
                    <div
                        className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                        style={{ aspectRatio: "16/9", minHeight: "520px" }}
                    >
                        {isLive ? (
                            <img
                                src={streamUrl}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-white/40">
                                    {cfg.message}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                    <div className="text-xs text-muted-foreground">
                        <span className="text-destructive font-medium">
                            {detections}
                        </span>{" "}
                        detections •{" "}
                        <span className="text-destructive font-medium">
                            {parkingSlots}
                        </span>{" "}
                        slots
                    </div>

                    {onRefresh && (
                        <Button size="sm" onClick={onRefresh}>
                            <RefreshCw className="size-3.5" />
                            Refresh
                        </Button>
                    )}
                </CardFooter>
            </Card>
        )
    }

    // ─────────────────────────────
    // DEFAULT
    // ─────────────────────────────
    return (
        <Card className="w-full ring-secondary hover:ring-secondary ring-1">
            <CardHeader className="flex flex-col gap-1">
                <CardTitle>
                    {title ?? "Live CCTV monitoring"}
                </CardTitle>

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
                    {isLive ? (
                        <img
                            src={streamUrl}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <p className="text-sm text-white/40">
                                {cfg.message}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-4">
                <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                        <span className="text-destructive font-medium">
                            {detections}
                        </span>{" "}
                        detections
                    </span>
                    <span>
                        <span className="text-destructive font-medium">
                            {parkingSlots}
                        </span>{" "}
                        parking slots
                    </span>
                </div>

                {onRefresh && (
                    <Button size="sm" onClick={onRefresh}>
                        <RefreshCw className="size-3.5" />
                        Refresh live feed
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}