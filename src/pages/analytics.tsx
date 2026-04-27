import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { AnalyticsLayout } from "@/layouts/analytics-layout"
import { AnalyticsStats } from "@/components/analytics-stats"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { AnalyticsActivityChart } from "@/components/analytics-activity-chart"
import { ExportDialog } from "@/components/export-dialog"

export function AnalyticsPage() {
    return (
        <>
            <PageHeader title="Analytics" description="Track revenue, vehicles, and parking performance" />
            <PageContent>
                <AnalyticsLayout
                    stats={<AnalyticsStats />}
                    charts={<AnalyticsCharts />}
                    actions={<ExportDialog range="all" />}
                    activity={<AnalyticsActivityChart />}
                />
            </PageContent>
        </>
    )
}