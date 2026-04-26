import type { ReactNode } from "react"

type Props = {
    tabs: ReactNode
    stats: ReactNode
    chart?: ReactNode
    table: ReactNode
    tableActions?: ReactNode
}

export function HistoryLayout({ tabs, stats, chart, table, tableActions }: Props) {
    return (
        <div className="flex flex-col gap-8 w-full px-6 pt-4 pb-6">
            <section aria-label="range-tabs">
                {tabs}
            </section>

            <section aria-label="stat-cards">
                {stats}
            </section>

            {chart && (
                <section aria-label="chart">
                    {chart}
                </section>
            )}

            <section aria-label="session-table">
                {tableActions && (
                    <div className="flex justify-end mb-3">
                        {tableActions}
                    </div>
                )}
                {table}
            </section>
        </div>
    )
}
