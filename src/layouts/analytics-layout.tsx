import type { ReactNode } from "react"
import { Separator } from "@/components/ui/separator"

type Props = {
    stats: ReactNode
    charts: ReactNode
}

export function AnalyticsLayout({ stats, charts }: Props) {
    return (
        <div className="flex flex-col gap-6 w-full px-6 pt-4 pb-8">
            <section aria-label="analytics-stats">
                {stats}
            </section>

            <Separator />

            <section aria-label="analytics-charts">
                {charts}
            </section>
        </div>
    )
}
