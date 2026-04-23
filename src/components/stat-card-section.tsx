import type { ReactNode } from "react"

export function StatCardSection({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-5 gap-4">
            {children}
        </div>
    )
}