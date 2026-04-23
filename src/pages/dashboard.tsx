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
        await fetch(UPLOAD_URL, { method: "POST", body: form })
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
                    <div className="grid grid-cols-3 gap-4">
                        {/* Main TV — 2/3 width */}
                        <div className="col-span-2">
                            <CCTVFeedCard
                                status="live"
                                streamUrl={streamSrc}
                                detections={0}
                                parkingSlots={0}
                                onRefresh={handleRefresh}
                            />
                        </div>
                        {/* Demo inference TV — 1/3 width */}
                        <div className="col-span-1">
                            <CCTVFeedCard
                                size="sm"
                                status="connecting"
                                streamUrl={demoSrc}
                                title="Demo Inference"
                                description="Upload an MP4 to run detection"
                                onUpload={handleUpload}
                            />
                        </div>
                    </div>
                }
                alerts={<ActiveAlerts />}
                legend={<ParkingStatusLegend />}
                summary={<ParkingSummary />}
            />
        </PageContent>
    )
}
