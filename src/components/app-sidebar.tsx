"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { sidebarData } from "@/configs/sidebar-data"
import { LogOut } from "lucide-react"

type Props = {
  active: string
  onNavigate: (url: string) => void
  onLogout: () => void
}

export function AppSidebar({
  active,
  onNavigate,
  onLogout,
  ...props
}: Props & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>

      {/* HEADER AREA */}
      <div className="px-4 py-3 font-semibold border-b">
        Dashboard
      </div>

      {/* MAIN CONTENT */}
      <SidebarContent className="flex flex-col h-full">

        <SidebarMenu className="flex-1">
          {sidebarData.map((item) => {
            const Icon = item.icon
            const isActive = active === item.url

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => onNavigate(item.url)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* DIVIDER */}
        <div className="border-t my-2" />

        {/* LOGOUT FIXED AT BOTTOM */}
        <div className="p-2">
          <SidebarMenuButton onClick={onLogout}>
            <div className="flex items-center gap-2 text-red-500">
              <LogOut className="size-4" />
              <span>Logout</span>
            </div>
          </SidebarMenuButton>
        </div>

      </SidebarContent>
    </Sidebar>
  )
}