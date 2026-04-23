import { RefreshCw } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CCTVStatus = "connecting" | "live" | "disconnected"

type Props = {
    status?: CCTVStatus
    streamUrl?: string
    detections?: number
    parkingSlots?: number
    onRefresh?: () => void
    onTestConnection?: () => void
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
    onRefresh,
    onTestConnection,
}: Props) {
    const cfg = statusConfig[status]
    const isLive = status === "live" && !!streamUrl

    return (
        <Card
            className={cn(
                "w-full ring-2",
                status === "live"
                    ? "ring-green-500/60 hover:ring-green-500/60"
                    : "ring-destructive/60 hover:ring-destructive/60"
            )}
        >
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

            <CardContent>
                {/* Feed area */}
                <div className="relative w-full overflow-hidden rounded-lg bg-[#0d1117]" style={{ aspectRatio: "16/9" }}>
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
                </div>
            </CardContent>

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
        </Card>
    )
}
