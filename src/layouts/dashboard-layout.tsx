import * as React from "react"

export default function DashboardLayout({
    sidebar,
    children,
}: {
    sidebar: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen">
            {sidebar}

            <div className="flex-1 flex flex-col">
                <div className="h-16 border-b flex items-center px-4 font-medium">
                    Smart Dashboard
                </div>

                <div className="p-4 flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}