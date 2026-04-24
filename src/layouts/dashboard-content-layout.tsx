import type { ReactNode } from "react"

type Props = {
    feed: ReactNode
    alerts: ReactNode
    legend: ReactNode
    summary: ReactNode
    slots: ReactNode
}

export function DashboardContentLayout({ feed, alerts, legend, summary, slots }: Props) {
    return (
        <div className="flex gap-4 w-full px-6 pt-4 pb-6">
            {/* Left: CCTV feed + alerts */}
            <div className="flex flex-1 flex-col gap-4 min-w-0">
                <section aria-label="cctv-feed">{feed}</section>
                <section aria-label="active-alerts">{alerts}</section>
            </div>

            {/* Right: legend + summary + parking slots */}
            <div className="flex w-72 shrink-0 flex-col gap-4">
                <section aria-label="status-legend">{legend}</section>
                <section aria-label="parking-summary">{summary}</section>
                <section aria-label="parking-slots">{slots}</section>
            </div>
        </div>
    )
}
