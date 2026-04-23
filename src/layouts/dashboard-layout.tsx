import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

type Props = {
    children: React.ReactNode
    active: string
    onNavigate: (url: string) => void
    onLogout: () => void
}

export default function DashboardLayout({
    children,
    active,
    onNavigate,
    onLogout,
}: Props) {
    return (
        <SidebarProvider>
            <AppSidebar
                active={active}
                onNavigate={onNavigate}
                onLogout={onLogout}
            />

            <SidebarInset>
                <header className="flex h-16 items-center gap-2 border-b">
                    <div className="flex items-center gap-2 px-4 w-full">
                        <SidebarTrigger className="-ml-1" />

                        <Separator orientation="vertical" className="mr-2 h-4" />

                        <span className="font-medium">Dashboard</span>

                        <button
                            onClick={onLogout}
                            className="ml-auto text-sm text-red-500"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-4 p-4">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}