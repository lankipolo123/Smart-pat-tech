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
      <div className="w-44 border-r border-secondary/40 h-screen flex flex-col">

        {/* HEADER */}
        <div className="h-[87px] px-4 border-b border-secondary/40 flex items-center overflow-hidden">

          <div className="flex items-center gap-2">

            <img
              src="https://i.imgur.com/xDSUCZY.png"
              alt="Logo"
              className="h-10 w-10 object-contain shrink-0"
            />

            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">
                TechSentinel
              </span>
              <span className="text-[10px] text-muted-foreground">
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
            <DialogTitle className="text-primary">
              Confirm Logout
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-3">

            {/* CANCEL (BLACK) */}
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md bg-black text-white text-sm hover:bg-black/80 transition"
            >
              Cancel
            </button>

            {/* PRIMARY ACTION */}
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