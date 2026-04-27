import { useState, useCallback } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { DashboardContentLayout } from "@/layouts/dashboard-content-layout"
import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ActiveAlerts } from "@/components/active-alerts"
import { ParkingSummary } from "@/components/parking-summary"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"
import { STREAM_URL } from "@/services/camera"

export function DashboardPage() {
    const [streamSrc, setStreamSrc] = useState(`${STREAM_URL}?t=${Date.now()}`)

    const handleRefresh = useCallback(() => {
        setStreamSrc(`${STREAM_URL}?t=${Date.now()}`)
    }, [])

    return (
        <>
            <PageHeader title="Dashboard" description="Real-time occupancy monitoring" />
            <PageContent>
                <DashboardContentLayout
                    feed={
                        <CCTVFeedCard
                            streamUrl={streamSrc}
                            onRefresh={handleRefresh}
                        />
                    }
                    alerts={<ActiveAlerts />}
                    summary={<ParkingSummary />}
                    slots={<ParkingSlotsGrid compact />}
                />
            </PageContent>
        </>
    )
}
