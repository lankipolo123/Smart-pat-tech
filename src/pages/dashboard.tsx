import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { DashboardContentLayout } from "@/layouts/dashboard-content-layout"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ActiveAlerts } from "@/components/active-alerts"
import { ParkingStatusLegend } from "@/components/parking-status-legend"
import { ParkingSummary } from "@/components/parking-summary"
import { cn } from "@/lib/utils"

const STREAM_URL = "http://localhost:8000/video"
const UPLOAD_URL = "http://localhost:8000/upload"

export function DashboardPage() {
    const [mode, setMode] = useState<"camera" | "demo">("camera")
    const [streamSrc, setStreamSrc] = useState(`${STREAM_URL}?t=${Date.now()}`)
    const [demoSrc, setDemoSrc] = useState(`${STREAM_URL}?t=${Date.now()}`)

    const handleRefresh = useCallback(() => {
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    const handleUpload = useCallback(async (file: File) => {
        const form = new FormData()
        form.append("file", file, file.name)
        try {
            await fetch(UPLOAD_URL, { method: "POST", body: form })
        } catch {
            // backend not running — stream will show disconnected
        }
        setDemoSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    return (
        <PageContent>
            <PageHeader
                title="Dashboard"
                description="Real-time occupancy monitoring"
            />
            <DashboardContentLayout
                feed={
                    <div className="flex flex-col gap-3">
                        {/* Mode toggle */}
                        <div className="flex w-fit overflow-hidden rounded-lg border border-secondary/40">
                            <button
                                onClick={() => setMode("camera")}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium transition-colors",
                                    mode === "camera"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Camera
                            </button>
                            <button
                                onClick={() => setMode("demo")}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium transition-colors border-l border-secondary/40",
                                    mode === "demo"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Demo Inference
                            </button>
                        </div>

                        <CCTVFeedCard
                            streamUrl={mode === "camera" ? streamSrc : demoSrc}
                            detections={0}
                            parkingSlots={0}
                            title={mode === "demo" ? "Demo Inference" : undefined}
                            description={mode === "demo" ? "Upload an MP4 to run detection" : undefined}
                            onRefresh={mode === "camera" ? handleRefresh : undefined}
                            onUpload={mode === "demo" ? handleUpload : undefined}
                        />
                    </div>
                }
                alerts={<ActiveAlerts />}
                legend={<ParkingStatusLegend />}
                summary={<ParkingSummary />}
            />
        </PageContent>
    )
}
