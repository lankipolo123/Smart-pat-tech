import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"
import { ParkingStatsCards } from "@/components/parking-stat-card"

const STREAM_URL = "http://localhost:8000/video"
const UPLOAD_URL = "http://localhost:8000/upload"

export function CCTVPage() {
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

    return (
        <PageContent>
            <PageHeader
                title="CCTV"
                description="Live parking slot monitoring"
            />

            <div className="px-6 pt-4 pb-8">
                {/* Main 2-panel layout */}
                <div className="flex gap-4 items-start">

                    {/* Left: huge CCTV feed */}
                    <div className="flex-[3] min-w-0">
                        <CCTVFeedCard
                            size="md"
                            streamUrl={streamSrc}
                            detections={0}
                            parkingSlots={0}
                            onRefresh={handleRefresh}
                            onUpload={handleUpload}
                        />
                    </div>

                    {/* Right: 2-column panel (stats | slots) */}
                    <div className="flex-[2] flex gap-4 min-w-0">
                        {/* Col 1: stat cards stacked */}
                        <div className="flex-1 min-w-0">
                            <ParkingStatsCards vertical />
                        </div>
                        {/* Col 2: parking slots grid */}
                        <div className="flex-1 min-w-0">
                            <ParkingSlotsGrid compact />
                        </div>
                    </div>

                </div>
            </div>
        </PageContent>
    )
}
