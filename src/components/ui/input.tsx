import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // BASE
        "h-8 w-full min-w-0 rounded-lg border border-secondary/40 bg-transparent px-2.5 py-1 text-base transition-colors outline-none",

        // PLACEHOLDER
        "placeholder:text-secondary/60",

        // FOCUS STATE (IMPORTANT)
        "focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30",

        // DISABLED
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-secondary/10 disabled:opacity-50",

        // INVALID STATE
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",

        // DARK MODE SUPPORT
        "dark:bg-secondary/10 dark:border-secondary/30",

        className
      )}
      {...props}
    />
  )
}

export { Input }