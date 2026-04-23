import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { DashboardContentLayout } from "@/layouts/dashboard-content-layout"

import { CCTVFeedCard } from "@/components/cctv-feed-card"
import { ActiveAlerts } from "@/components/active-alerts"
import { ParkingStatusLegend } from "@/components/parking-status-legend"
import { ParkingSummary } from "@/components/parking-summary"

export function DashboardPage() {
    return (
        <PageContent>
            <PageHeader
                title="Dashboard"
                description="Real-time occupancy monitoring"
            />
            <DashboardContentLayout
                feed={
                    <CCTVFeedCard
                        status="connecting"
                        detections={0}
                        parkingSlots={0}
                    />
                }
                alerts={<ActiveAlerts />}
                legend={<ParkingStatusLegend />}
                summary={<ParkingSummary />}
            />
        </PageContent>
    )
}
