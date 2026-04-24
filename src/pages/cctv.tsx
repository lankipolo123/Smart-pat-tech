import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"
import { ParkingStatsCards } from "@/components/parking-stat-card"

const STREAM_URL = "http://localhost:8000/video"

export function CCTVPage() {
    const [streamSrc, setStreamSrc] = useState(
        `${STREAM_URL}?t=${Date.now()}`
    )

    const handleRefresh = useCallback(() => {
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    return (
        <PageContent>
            <PageHeader
                title="CCTV"
                description="Live parking slot monitoring"
            />

            <div className="px-6 pt-4 pb-8 flex flex-col gap-6">


                <ParkingStatsCards />


                <CCTVFeedCard
                    size="md"
                    status="live"
                    streamUrl={streamSrc}
                    onRefresh={handleRefresh}
                    detections={0}
                    parkingSlots={0}
                />


                <ParkingSlotsGrid />

            </div>
        </PageContent>
    )
}