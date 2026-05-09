import * as React from "react"
import { useState, useCallback } from "react"
import { SidebarToggle } from "@/components/sidebar-toggle-btn"

type Props = {
    sidebar: (collapsed: boolean) => React.ReactNode
    children: React.ReactNode
}

export default function DashboardLayout({ sidebar, children }: Props) {
    const [collapsed, setCollapsed] = useState(false)
    const toggle = useCallback(() => setCollapsed(c => !c), [])

    return (
        <div className="flex h-screen w-full overflow-hidden">

            {/* SIDEBAR */}
            <aside className="relative h-full shrink-0">
                {sidebar(collapsed)}

                {/* CHEVRON — straddling the bottom border of sidebar header */}
                <div className="absolute top-[87px] -translate-y-1/2 -right-4 z-40">
                    <SidebarToggle collapsed={collapsed} onClick={toggle} />
                </div>
            </aside>

            {/* MAIN AREA */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {children}
            </div>

        </div>
    )
}