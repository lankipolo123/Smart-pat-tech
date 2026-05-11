import { useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { HistoryLayout } from "@/layouts/history-layout"

import { RangeTabs } from "@/components/range-tabs"
import { HistoryStats } from "@/components/history-stats"
import { HistoryTable } from "@/components/history-table"
import { ExportDialog } from "@/components/export-dialog"

import { type ParkingRange } from "@/configs/parking-range.config"
import { createSessionExportConfig } from "@/utils/session-export-utils"

export function HistoryPage() {
    const [range, setRange] = useState<ParkingRange>("today")

    return (
        <>
            <PageHeader title="Parking History Records" description="Monitor occupancy, revenue, and vehicle activity" />
            <PageContent>
                <HistoryLayout
                    tabs={<RangeTabs range={range} onRangeChange={setRange} />}
                    stats={<HistoryStats range={range} />}
                    table={<HistoryTable range={range} />}
                    tableActions={<ExportDialog config={createSessionExportConfig(range)} />}
                />
            </PageContent>
        </>
    )
}