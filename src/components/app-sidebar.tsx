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
  colored?: boolean
}

export function AppSidebar({
  active,
  onNavigate,
  onLogout,
  collapsed,
  colored = false,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className={`h-screen flex flex-col transition-all duration-200 ease-linear border-r
          ${colored
            ? "bg-primary border-primary"
            : "bg-background border-secondary/40"}
          ${collapsed ? "w-[52px]" : "w-44"}
        `}
      >

        {/* HEADER */}
        <div
          className={`relative h-[87px] px-4 flex items-center overflow-hidden border-b
            ${colored
              ? "border-white/20"
              : "border-secondary/40"}
          `}
        >

          {/* EXPANDED */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150
              ${collapsed
                ? "opacity-0 pointer-events-none"
                : "opacity-100"}
            `}
          >
            <img
              src="https://i.imgur.com/k0G0eJ2.png"
              alt="Logo"
              className={`h-30 w-full object-contain px-3
                ${colored ? "brightness-0 invert" : ""}
              `}
            />
          </div>

          {/* COLLAPSED */}
          {collapsed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="https://i.imgur.com/xDSUCZY.png"
                alt="Logo"
                className={`h-8 w-8 object-contain
                  ${colored ? "brightness-0 invert" : ""}
                `}
              />
            </div>
          )}
        </div>

        {/* NAV */}
        <div className="flex-1 p-2 pt-6 flex flex-col gap-1 overflow-hidden">
          {collapsed ? (
            <TooltipProvider delay={200} closeDelay={0}>
              {sidebarData.map((item) => {
                const isActive = active === item.url

                return (
                  <Tooltip key={item.url}>
                    <TooltipTrigger>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.url)}
                        className={`w-full flex items-center justify-center px-3 py-3 rounded-lg transition-colors
                          ${isActive
                            ? colored
                              ? "text-white font-medium"
                              : "text-primary font-medium"
                            : colored
                              ? "text-white/60 hover:text-white"
                              : "text-secondary hover:text-primary"
                          }
                        `}
                      >
                        <item.icon
                          className={`size-4 shrink-0 transition-colors
                            ${isActive
                              ? colored
                                ? "text-white"
                                : "text-primary"
                              : colored
                                ? "text-white/60 hover:text-white"
                                : "text-secondary hover:text-primary"
                            }
                          `}
                        />
                      </button>
                    </TooltipTrigger>

                    <TooltipContent
                      side="right"
                      colored={colored}
                    >
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
                  type="button"
                  onClick={() => onNavigate(item.url)}
                  className={`group w-full flex items-center gap-2 px-3 py-3 rounded-lg transition-colors
                    ${isActive
                      ? colored
                        ? "text-white font-medium"
                        : "text-primary font-medium"
                      : colored
                        ? "text-white/60 hover:text-white"
                        : "text-secondary hover:text-primary"
                    }
                  `}
                >
                  <item.icon
                    className={`size-4 shrink-0 transition-colors
                      ${isActive
                        ? colored
                          ? "text-white"
                          : "text-primary"
                        : colored
                          ? "text-white/60 group-hover:text-white"
                          : "text-secondary group-hover:text-primary"
                      }
                    `}
                  />

                  <span className="truncate">
                    {item.title}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* LOGOUT */}
        <div
          className={`border-t p-2
            ${colored
              ? "border-white/20"
              : "border-secondary/40"}
          `}
        >
          {collapsed ? (
            <TooltipProvider delay={200} closeDelay={0}>
              <Tooltip>
                <TooltipTrigger>
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={`w-full flex items-center justify-center px-3 py-3 rounded-lg transition-colors
                      ${colored
                        ? "text-white/60 hover:text-white"
                        : "text-red-500 hover:text-red-600"}
                    `}
                  >
                    <LogOut className="size-4 shrink-0" />
                  </button>
                </TooltipTrigger>

                <TooltipContent
                  side="right"
                  colored={colored}
                >
                  Logout
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={`w-full flex items-center gap-2 px-3 py-3 rounded-lg transition-colors
                ${colored
                  ? "text-white/60 hover:text-white"
                  : "text-red-500 hover:text-red-600"}
              `}
            >
              <LogOut className="size-4 shrink-0" />
              Logout
            </button>
          )}
        </div>
      </div>

      {/* LOGOUT DIALOG */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
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
            <button
              type="button"
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