import { useState } from "react"
import { X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type Alert = {
    id: string
    message: string
    severity?: "warning" | "critical" | "info"
}

type Props = {
    alerts?: Alert[]
    onDismiss?: (id: string) => void
}

const severityStyles: Record<NonNullable<Alert["severity"]>, string> = {
    warning: "border-yellow-400/50 bg-yellow-400/10 text-yellow-700 dark:text-yellow-400",
    critical: "border-destructive/50 bg-destructive/10 text-destructive",
    info: "border-blue-400/50 bg-blue-400/10 text-blue-700 dark:text-blue-400",
}

export function ActiveAlerts({ alerts = [], onDismiss }: Props) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())

    const visible = alerts.filter((a) => !dismissed.has(a.id))

    const handleDismiss = (id: string) => {
        setDismissed((prev) => new Set(prev).add(id))
        onDismiss?.(id)
    }

    if (visible.length === 0) return (
        <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold">Active Alerts</p>
            <p className="text-sm text-muted-foreground">No activity recorded today.</p>
        </div>
    )

    return (
        <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold">Active Alerts</p>
            <div className="flex flex-col gap-2">
                {visible.map((alert) => {
                    const severity = alert.severity ?? "warning"
                    return (
                        <div
                            key={alert.id}
                            className={cn(
                                "flex items-center justify-between rounded-md border px-4 py-2 text-sm",
                                severityStyles[severity]
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                <span>{alert.message}</span>
                            </div>
                            <button
                                onClick={() => handleDismiss(alert.id)}
                                className="ml-4 shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                                aria-label="Dismiss alert"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}