import { RefreshCw, Upload } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRef } from "react"

export type CCTVStatus = "connecting" | "live" | "disconnected"

type Props = {
    status?: CCTVStatus
    streamUrl?: string
    detections?: number
    parkingSlots?: number
    size?: "default" | "compact"
    onRefresh?: () => void
    onTestConnection?: () => void
    onUpload?: (file: File) => void
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
    status = "connecting",
    streamUrl,
    detections = 0,
    parkingSlots = 0,
    size = "default",
    onRefresh,
    onTestConnection,
    onUpload,
}: Props) {
    const cfg = statusConfig[status]
    const isLive = status === "live" && !!streamUrl
    const fileRef = useRef<HTMLInputElement>(null)
    const isCompact = size === "compact"

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onUpload?.(file)
        e.target.value = ""
    }

    return (
        <Card className={cn("w-full ring-secondary hover:ring-secondary", isCompact && "ring-1")}>

            {/* Header — hidden in compact */}
            {!isCompact && (
                <CardHeader>
                    <CardTitle>Live CCTV monitoring</CardTitle>
                    <CardDescription>Direct camera feed from your CCTV source.</CardDescription>
                    <span className={cn(
                        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
                        "rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase",
                        cfg.pill
                    )}>
                        {cfg.label}
                    </span>
                </CardHeader>
            )}

            <CardContent className={cn(isCompact && "p-1.5")}>
                {/* Status pill overlay for compact mode */}
                <div className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]"
                    style={{ aspectRatio: "16/9", maxHeight: isCompact ? "180px" : undefined }}
                >
                    {isLive ? (
                        <img
                            src={streamUrl}
                            alt="CCTV live feed"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <p className="text-sm text-white/40">{cfg.message}</p>
                        </div>
                    )}

                    {/* Compact: pill overlaid on feed */}
                    {isCompact && (
                        <span className={cn(
                            "absolute top-2 right-2 rounded-full px-2 py-0.5",
                            "text-[9px] font-bold tracking-widest uppercase",
                            cfg.pill
                        )}>
                            {cfg.label}
                        </span>
                    )}
                </div>
            </CardContent>

            {/* Footer — hidden in compact */}
            {!isCompact && (
                <CardFooter className="flex items-center justify-between gap-4">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                            <span className="text-destructive font-medium">{detections}</span> detections
                        </span>
                        <span>
                            <span className="text-destructive font-medium">{parkingSlots}</span> parking slots
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
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
                        <Button size="sm" onClick={onRefresh}>
                            <RefreshCw className="size-3.5" />
                            Refresh live feed
                        </Button>
                        <button
                            onClick={onTestConnection}
                            className="text-xs text-muted-foreground underline-offset-4 hover:underline cursor-pointer"
                        >
                            Test camera connection
                        </button>
                    </div>
                </CardFooter>
            )}
        </Card>
    )
}
