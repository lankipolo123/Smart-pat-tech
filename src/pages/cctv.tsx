import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"
import { CCTVFeedCard } from "@/components/cctv-feed-card"

const STREAM_URL = "http://localhost:8000/video"

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
            <div className="px-6 pt-4 pb-8 flex flex-col gap-6">
                {/* Compact live feed */}
                <div className="w-72">
                    <CCTVFeedCard
                        size="compact"
                        status="live"
                        streamUrl={streamSrc}
                    />
                </div>

                {/* Slot grid */}
                <ParkingSlotsGrid />
            </div>
        </PageContent>
    )
}
