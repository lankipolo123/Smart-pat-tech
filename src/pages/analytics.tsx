import { useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { AnalyticsLayout } from "@/layouts/analytics-layout"
import { AnalyticsStats } from "@/components/analytics-stats"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { Separator } from "@/components/ui/separator"
import { RangeTabs } from "@/components/range-tabs"
import { HistoryStats } from "@/components/history-stats"
import { HistoryChart } from "@/components/history-chart"
import { HistoryTable } from "@/components/history-table"

import { type ParkingRange } from "@/configs/parking-range.config"

export function AnalyticsPage() {
    const [range, setRange] = useState<ParkingRange>("today")

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

            <div className="flex flex-col gap-6 w-full px-6 pb-8">
                <Separator />
                <RangeTabs range={range} onRangeChange={setRange} />
                <HistoryStats range={range} />
                <HistoryChart range={range} />
                <HistoryTable range={range} />
            </div>
        </PageContent>
    )
}
