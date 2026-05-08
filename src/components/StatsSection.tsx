import { type ReactNode } from "react"

interface StatsSectionProps {
    children: ReactNode
}

export function StatsSection({ children }: StatsSectionProps) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {children}
        </div>
    )
}
