import * as React from "react"
import { cn } from "@/lib/utils"

/* =========================
   CARD ROOT
========================= */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground",

        // ✅ PRIMARY CHANGE: SECONDARY BORDER SYSTEM
        "ring-1 ring-secondary/40 hover:ring-secondary/70 transition-colors",

        "has-data-[slot=card-footer]:pb-0",
        "has-[>img:first-child]:pt-0",

        "data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0",

        "*:[img:first-child]:rounded-t-xl",
        "*:[img:last-child]:rounded-b-xl",

        className
      )}
      {...props}
    />
  )
}

/* =========================
   CARD HEADER
========================= */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",

        // ✅ SECONDARY BORDER
        "border-b border-secondary/40 pb-4",
        "group-data-[size=sm]/card:pb-3",

        className
      )}
      {...props}
    />
  )
}

/* =========================
   CARD TITLE
========================= */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

/* =========================
   CARD DESCRIPTION
========================= */
function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/* =========================
   CARD ACTION
========================= */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

/* =========================
   CARD CONTENT
========================= */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

/* =========================
   CARD FOOTER
========================= */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl bg-muted/50 p-4",

        // ✅ SECONDARY BORDER
        "border-t border-secondary/40",

        "group-data-[size=sm]/card:p-3",

        className
      )}
      {...props}
    />
  )
}

/* =========================
   EXPORTS
========================= */
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}