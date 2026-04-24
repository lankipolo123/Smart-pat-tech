import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { DashboardContentLayout } from "@/layouts/dashboard-content-layout"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ActiveAlerts } from "@/components/active-alerts"
import { ParkingStatusLegend } from "@/components/parking-status-legend"
import { ParkingSummary } from "@/components/parking-summary"

const STREAM_URL = "http://localhost:8000/video"
const UPLOAD_URL = "http://localhost:8000/upload"

export function DashboardPage() {
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
                    <div className="flex flex-col gap-4">
                        <CCTVFeedCard
                            streamUrl={streamSrc}
                            detections={0}
                            parkingSlots={0}
                            onRefresh={handleRefresh}
                        />
                        <CCTVFeedCard
                            size="sm"
                            streamUrl={demoSrc}
                            title="Demo Inference"
                            description="Upload an MP4 to run detection"
                            onUpload={handleUpload}
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
