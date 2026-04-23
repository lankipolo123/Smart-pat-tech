import type { ReactNode } from "react"

type Props = {
    tabs: ReactNode
    stats: ReactNode
    chart: ReactNode
}

export function HistoryLayout({ tabs, stats, chart }: Props) {
    return (
        <div className="flex flex-col gap-8 w-full px-6 pt-4">
            <section aria-label="range-tabs">
                {tabs}
            </section>

            <section aria-label="stat-cards">
                {stats}
            </section>

            <section aria-label="chart">
                {chart}
            </section>
        </div>
    )
}