import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"
import { ParkingStatsCards } from "@/components/parking-stat-card"
import { STREAM_URL } from "@/services/camera"

export function CCTVPage() {
    const [streamSrc, setStreamSrc] = useState(`${STREAM_URL}?t=${Date.now()}`)

    const handleRefresh = useCallback(() => {
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    return (
        <PageContent>
            <PageHeader
                title="CCTV"
                description="Live parking slot monitoring"
            />

            <div className="px-6 pt-4 pb-8">
                <div className="flex gap-4 items-start">

                    <div className="flex-[55] min-w-0">
                        <CCTVFeedCard
                            streamUrl={streamSrc}
                            onRefresh={handleRefresh}
                        />
                    </div>

                    <div className="flex-[45] flex flex-col gap-4 min-w-0">
                        <ParkingStatsCards />
                        <ParkingSlotsGrid compact />
                    </div>

                </div>
            </div>
        </PageContent>
    )
}
