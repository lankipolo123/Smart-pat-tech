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

    const handleRefresh = useCallback(() => {
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    const handleUpload = useCallback(async (file: File) => {
        const form = new FormData()
        form.append("file", file, file.name)

        await fetch(UPLOAD_URL, {
            method: "POST",
            body: form,
        })

        // refresh stream after upload
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    return (
        <PageContent>
            <PageHeader
                title="Dashboard"
                description="Real-time occupancy monitoring"
            />

            <DashboardContentLayout
                feed={
                    <div className="grid grid-cols-1">
                        {/* SINGLE BIG TV (now includes upload) */}
                        <CCTVFeedCard
                            size="md"
                            status="live"
                            streamUrl={streamSrc}
                            detections={0}
                            parkingSlots={0}
                            onRefresh={handleRefresh}
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