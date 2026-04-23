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

type Props = {
  active: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

export function AppSidebar({ active, onNavigate, onLogout }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="w-64 border-r border-secondary/40 h-screen flex flex-col">

        {/* HEADER (LOCKED 81PX) */}
        <div className="h-[87px] px-6 border-b border-secondary/40 flex items-center overflow-hidden">

          <div className="flex items-center gap-3">

            <img
              src="https://i.imgur.com/xDSUCZY.png"
              alt="Logo"
              className="h-14 w-14 object-contain shrink-0"
            />

            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold">
                TechSentinel
              </span>
              <span className="text-xs text-muted-foreground">
                Smart Park
              </span>
            </div>

          </div>

        </div>

        {/* NAV */}
        <div className="flex-1 p-4 flex flex-col gap-2">

          {sidebarData.map((item) => {
            const isActive = active === item.url

            return (
              <button
                key={item.url}
                onClick={() => onNavigate(item.url)}
                className={`w-full flex items-center gap-2 px-3 py-3 rounded-lg transition-colors
                  ${isActive
                    ? "text-primary font-medium"
                    : "text-secondary hover:text-primary"
                  }
                `}
              >
                <item.icon
                  className={`size-4 transition-colors
                    ${isActive ? "text-primary" : "text-secondary"}
                  `}
                />

                {item.title}
              </button>
            )
          })}

        </div>

        {/* LOGOUT */}
        <div className="border-t border-secondary/40 p-2">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-3 text-red-500 hover:text-red-600 rounded-lg"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>

      </div>

      {/* DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>

          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
            >
              Logout
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  )
}