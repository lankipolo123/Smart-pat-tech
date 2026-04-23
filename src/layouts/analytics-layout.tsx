import type { ReactNode } from "react"

type Props = {
    stats: ReactNode
    revenueChart: ReactNode
    vehicleChart: ReactNode
}

export function AnalyticsLayout({ stats, revenueChart, vehicleChart }: Props) {
    return (
        <div className="flex flex-col gap-8 w-full px-6 pt-4 pb-8">
            <section aria-label="analytics-stats">
                {stats}
            </section>
            <section aria-label="revenue-chart">
                {revenueChart}
            </section>
            <section aria-label="vehicle-chart">
                {vehicleChart}
            </section>
        </div>
    )
}
