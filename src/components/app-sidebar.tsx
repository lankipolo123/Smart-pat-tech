"use client"

import { useState } from "react"
import { sidebarData } from "@/configs/sidebar-data"
import { LogOut } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

type Props = {
  active: string
  onNavigate: (page: string) => void
  onLogout: () => void
  collapsed: boolean
}

export function AppSidebar({ active, onNavigate, onLogout, collapsed }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className={`border-r border-secondary/40 h-screen flex flex-col transition-all duration-200 ease-linear ${collapsed ? "w-[52px]" : "w-44"
          }`}
      >

        {/* HEADER */}
        <div className="relative h-[87px] px-4 border-b border-secondary/40 flex items-center overflow-hidden">

          {/* EXPANDED */}
          <div className={`flex items-center gap-2 transition-opacity duration-150 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}>
            <img
              src="https://i.imgur.com/xDSUCZY.png"
              alt="Logo"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">TechSentinel</span>
              <span className="text-[10px] text-muted-foreground">Smart Park</span>
            </div>
          </div>

          {/* COLLAPSED */}
          {collapsed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="https://i.imgur.com/xDSUCZY.png"
                alt="Logo"
                className="h-8 w-8 object-contain"
              />
            </div>
          )}

        </div>

        {/* NAV */}
        <div key={String(collapsed)} className="flex-1 p-2 pt-6 flex flex-col gap-1 overflow-hidden">
          {collapsed ? (
            // COLLAPSED — with tooltips
            <TooltipProvider delay={200} closeDelay={0}>
              {sidebarData.map((item) => {
                const isActive = active === item.url
                return (
                  <Tooltip key={item.url}>
                    <TooltipTrigger
                      onClick={() => onNavigate(item.url)}
                      className={`w-full flex items-center justify-center px-3 py-3 rounded-lg transition-colors ${isActive
                          ? "text-primary font-medium"
                          : "text-secondary hover:text-primary"
                        }`}
                    >
                      <item.icon
                        className={`size-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-secondary"
                          }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          ) : (
            // EXPANDED — plain buttons, no tooltip at all
            sidebarData.map((item) => {
              const isActive = active === item.url
              return (
                <button
                  key={item.url}
                  onClick={() => onNavigate(item.url)}
                  className={`w-full flex items-center gap-2 px-3 py-3 rounded-lg transition-colors ${isActive
                      ? "text-primary font-medium"
                      : "text-secondary hover:text-primary"
                    }`}
                >
                  <item.icon
                    className={`size-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-secondary"
                      }`}
                  />
                  <span className="truncate">{item.title}</span>
                </button>
              )
            })
          )}
        </div>

        {/* LOGOUT */}
        <div className="border-t border-secondary/40 p-2">
          {collapsed ? (
            <TooltipProvider delay={200} closeDelay={0}>
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setOpen(true)}
                  className="w-full flex items-center justify-center px-3 py-3 text-red-500 hover:text-red-600 rounded-lg"
                >
                  <LogOut className="size-4 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  Logout
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-3 text-red-500 hover:text-red-600 rounded-lg"
            >
              <LogOut className="size-4 shrink-0" />
              Logout
            </button>
          )}
        </div>

      </div>

      {/* LOGOUT DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Confirm Logout</DialogTitle>
            <DialogDescription>Are you sure you want to logout?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-3">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md bg-black text-white text-sm hover:bg-black/80 transition"
            >
              Cancel
            </button>
            <Button
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}