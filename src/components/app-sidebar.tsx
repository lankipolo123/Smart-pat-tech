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
        className={`bg-primary border-r border-primary h-screen flex flex-col transition-all duration-200 ease-linear ${collapsed ? "w-[52px]" : "w-44"
          }`}
      >

        {/* HEADER */}
        <div className="relative h-[87px] px-4 border-b border-white/20 flex items-center overflow-hidden">

          {/* EXPANDED */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}>
            <img
              src="https://i.imgur.com/k0G0eJ2.png"
              alt="Logo"
              className="h-30 w-full object-contain brightness-0 invert px-3"
            />
          </div>

          {/* COLLAPSED */}
          {collapsed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="https://i.imgur.com/xDSUCZY.png"
                alt="Logo"
                className="h-8 w-8 object-contain brightness-0 invert"
              />
            </div>
          )}

        </div>

        {/* NAV */}
        <div key={String(collapsed)} className="flex-1 p-2 pt-6 flex flex-col gap-1 overflow-hidden">
          {collapsed ? (
            <TooltipProvider delay={200} closeDelay={0}>
              {sidebarData.map((item) => {
                const isActive = active === item.url
                return (
                  <Tooltip key={item.url}>
                    <TooltipTrigger
                      onClick={() => onNavigate(item.url)}
                      className={`w-full flex items-center justify-center px-3 py-3 rounded-lg transition-colors ${isActive
                        ? "text-white font-medium"
                        : "text-white/60 hover:text-white"
                        }`}
                    >
                      <item.icon
                        className={`size-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-white/60 hover:text-white"
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
            sidebarData.map((item) => {
              const isActive = active === item.url
              return (
                <button
                  key={item.url}
                  onClick={() => onNavigate(item.url)}
                  className={`group w-full flex items-center gap-2 px-3 py-3 rounded-lg transition-colors ${isActive
                    ? " text-white font-medium"
                    : "text-white/60 hover:text-white"
                    }`}
                >
                  <item.icon
                    className={`size-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-white/60 group-hover:text-white"
                      }`}
                  />
                  <span className="truncate">{item.title}</span>
                </button>
              )
            })
          )}
        </div>

        {/* LOGOUT */}
        <div className="border-t border-white/20 p-2">
          {collapsed ? (
            <TooltipProvider delay={200} closeDelay={0}>
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setOpen(true)}
                  className="w-full flex items-center justify-center px-3 py-3 text-white/60 hover:text-white"
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
              className="w-full flex items-center gap-2 px-3 py-3 text-white/60 hover:text-white"
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
              className="bg-primary text-primary-foreground"
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}