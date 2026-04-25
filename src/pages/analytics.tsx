import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { AnalyticsLayout } from "@/layouts/analytics-layout"
import { AnalyticsStats } from "@/components/analytics-stats"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { AnalyticsActivityChart } from "@/components/analytics-activity-chart"

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
            <div className="w-full px-6 pb-8">
                <AnalyticsActivityChart />
            </div>
        </PageContent>
    )
}
