
import { useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { HistoryLayout } from "@/layouts/history-layout"

import { RangeTabs } from "@/components/range-tabs"
import { HistoryStats } from "@/components/history-stats"
import { HistoryChart } from "@/components/history-chart"

import { type ParkingRange } from "@/configs/parking-range.config"

export function HistoryPage() {
    const [range, setRange] = useState<ParkingRange>("week")

    return (
        <PageContent>
            <PageHeader title="History" description="History Logs" />
            <HistoryLayout
                tabs={<RangeTabs range={range} onRangeChange={setRange} />}
                stats={<HistoryStats />}
                chart={<HistoryChart range={range} />}
            />
        </PageContent>
    )
}