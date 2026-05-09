"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext =
  React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error(
      "useChart must be used within a <ChartContainer />"
    )
  }

  return context
}

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig
  children: React.ReactNode
}

function ChartContainer({
  className,
  children,
  config,
  style,
  ...props
}: ChartContainerProps) {
  const cssVariables = Object.entries(config).reduce(
    (acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color
      }

      return acc
    },
    {} as Record<string, string>
  )

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn("w-full text-xs", className)}
        style={{
          ...cssVariables,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type TooltipPayloadItem = {
  dataKey?: string | number
  name?: string
  value?: string | number
  color?: string
}

type ChartTooltipContentProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
  className?: string
}

function ChartTooltipContent({
  active,
  payload,
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background px-3 py-2 shadow-md",
        className
      )}
    >
      <div className="space-y-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? "")
          const itemConfig = config[key]

          return (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{
                    backgroundColor:
                      item.color ||
                      `var(--color-${key})`,
                  }}
                />

                <span className="text-muted-foreground">
                  {itemConfig?.label ??
                    item.name ??
                    key}
                </span>
              </div>

              <span className="font-medium tabular-nums">
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
}