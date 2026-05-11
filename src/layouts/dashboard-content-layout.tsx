import type { ReactNode } from "react"

type Props = {
    feed: ReactNode
    alerts: ReactNode
    summary: ReactNode
    slots: ReactNode
}

export function DashboardContentLayout({ feed, alerts, summary, slots }: Props) {
    return (
        <div className="flex flex-col gap-4 w-full px-6 pt-4 pb-6">

            {/* Top row: CCTV feed (left) + summary & slots (right) */}
            <div className="flex gap-4 w-full">
                <section aria-label="cctv-feed" className="flex-[55] min-w-0">
                    {feed}
                </section>

                <div className="flex-[45] flex flex-col gap-4 min-w-0 self-stretch">
                    <section aria-label="parking-summary" className="shrink-0">
                        {summary}
                    </section>
                    <section aria-label="parking-slots" className="flex-1 min-h-0">
                        {slots}
                    </section>
                </div>
            </div>

            {/* Bottom row: today's activity full width */}
            <section aria-label="today-activity" className="w-full">
                {alerts}
            </section>

        </div>
    )
}