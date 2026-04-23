import type { ReactNode } from "react"

export function StatCardSection({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-6 gap-4">
            {children}
        </div>
    )
}