import { type ReactNode } from "react"

interface PanelLayoutProps {
    children: ReactNode
}

export function PanelLayout({ children }: PanelLayoutProps) {
    return (
        <div className="flex flex-col gap-4 h-full">
            {children}
        </div>
    )
}
