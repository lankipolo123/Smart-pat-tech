import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { DashboardContentLayout } from "@/layouts/dashboard-content-layout"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ActiveAlerts } from "@/components/active-alerts"
import { ParkingSummary } from "@/components/parking-summary"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"

const STREAM_URL  = "http://localhost:8000/video"
const UPLOAD_URL  = "http://localhost:8000/upload"
const WEBCAM_URL  = "http://localhost:8000/webcam"
const CONNECT_URL = "http://localhost:8000/connect"

export function DashboardPage() {
    const [streamSrc, setStreamSrc] = useState(`${STREAM_URL}?t=${Date.now()}`)

    const handleRefresh = useCallback(() => {
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    const handleUpload = useCallback(async (file: File) => {
        const form = new FormData()
        form.append("file", file, file.name)
        try {
            await fetch(UPLOAD_URL, { method: "POST", body: form })
        } catch {
            // backend not running
        }
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    const handleWebcam = useCallback(async () => {
        try { await fetch(WEBCAM_URL, { method: "POST" }) } catch {}
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    const handleConnect = useCallback(async (url: string) => {
        try {
            await fetch(CONNECT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            })
        } catch {}
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
                    <CCTVFeedCard
                        size="lg"
                        streamUrl={streamSrc}
                        detections={0}
                        parkingSlots={0}
                        onRefresh={handleRefresh}
                        onUpload={handleUpload}
                        onWebcam={handleWebcam}
                        onConnect={handleConnect}
                    />
                }
                alerts={<ActiveAlerts />}
                summary={<ParkingSummary />}
                slots={<ParkingSlotsGrid compact />}
            />
        </PageContent>
    )
}
