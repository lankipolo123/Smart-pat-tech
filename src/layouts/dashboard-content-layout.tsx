import type { ReactNode } from "react"

type Props = {
    feed: ReactNode
    alerts: ReactNode
    legend: ReactNode
    summary: ReactNode
}

export function DashboardContentLayout({ feed, alerts, legend, summary }: Props) {
    return (
        <div className="flex gap-6 w-full px-6 pt-4">
            {/* Left: CCTV feed + alerts */}
            <div className="flex flex-1 flex-col gap-6 min-w-0">
                <section aria-label="cctv-feed">{feed}</section>
                <section aria-label="active-alerts">{alerts}</section>
            </div>

            {/* Right: status legend + summary */}
            <div className="flex w-64 shrink-0 flex-col gap-6">
                <section aria-label="status-legend">{legend}</section>
                <section aria-label="parking-summary">{summary}</section>
            </div>
        </div>
    )
}
