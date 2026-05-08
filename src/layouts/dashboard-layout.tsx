import * as React from "react"

type Props = {
    sidebar: React.ReactNode
    children: React.ReactNode
    title?: string
    rightContent?: React.ReactNode
}

export default function DashboardLayout({
    sidebar,
    children,
    title = "Smart Dashboard",
    rightContent,
}: Props) {
    return (
        <div className="flex h-screen w-full overflow-hidden">

            {/* SIDEBAR */}
            <aside className="h-full shrink-0 overflow-y-auto">
                {sidebar}
            </aside>

            {/* MAIN AREA */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* TOP BAR */}
                <header className="h-16 border-b flex items-center justify-between px-4 shrink-0">

                    <div className="font-medium text-sm">
                        {title}
                    </div>

                    {rightContent && (
                        <div className="flex items-center gap-2">
                            {rightContent}
                        </div>
                    )}

                </header>

                {/* CONTENT */}
                <main className="flex-1 min-h-0 overflow-auto p-4">
                    {children}
                </main>

            </div>
        </div>
    )
}