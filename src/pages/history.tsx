import { useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { HistoryLayout } from "@/layouts/history-layout"

import { RangeTabs } from "@/components/range-tabs"
import { HistoryStats } from "@/components/history-stats"
import { HistoryChart } from "@/components/history-chart"
import { HistoryTable } from "@/components/history-table"

import { type ParkingRange } from "@/configs/parking-range.config"

export function HistoryPage() {
    const [range, setRange] = useState<ParkingRange>("today")

    return (
        <PageContent>
            <PageHeader title="Parking Management" description="Monitor occupancy, revenue, and vehicle activity" />
            <HistoryLayout
                tabs={<RangeTabs range={range} onRangeChange={setRange} />}
                stats={<HistoryStats range={range} />}
                chart={<HistoryChart range={range} />}
                table={<HistoryTable range={range} />}
            />
        </PageContent>
    )
}
