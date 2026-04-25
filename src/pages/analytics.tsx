import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { AnalyticsLayout } from "@/layouts/analytics-layout"
import { AnalyticsStats } from "@/components/analytics-stats"
import { AnalyticsCharts } from "@/components/analytics-charts"

export function AnalyticsPage() {
    return (
        <PageContent>
            <PageHeader
                title="Analytics"
                description="Track revenue, vehicles, and parking performance"
            />
            <AnalyticsLayout
                stats={<AnalyticsStats />}
                charts={<AnalyticsCharts />}
            />
        </PageContent>
    )
}
