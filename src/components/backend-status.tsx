// components/backend-status.tsx
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type BackendStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

type Props = {
    status: BackendStatus
    retryCount: number
    onRetry?: () => void
}

export function BackendStatus({ status, retryCount, onRetry }: Props) {
    const getStatusConfig = (status: BackendStatus) => {
        switch (status) {
            case 'connecting':
                return {
                    icon: RefreshCw,
                    color: "text-yellow-600",
                    bgColor: "bg-yellow-100",
                    borderColor: "border-yellow-300",
                    label: "Connecting...",
                    description: "Establishing connection to backend"
                }
            case 'connected':
                return {
                    icon: Wifi,
                    color: "text-green-600",
                    bgColor: "bg-green-100",
                    borderColor: "border-green-300",
                    label: "Connected",
                    description: "Backend is running and responsive"
                }
            case 'disconnected':
                return {
                    icon: WifiOff,
                    color: "text-red-600",
                    bgColor: "bg-red-100",
                    borderColor: "border-red-300",
                    label: "Disconnected",
                    description: "Cannot reach backend server"
                }
            case 'error':
                return {
                    icon: AlertTriangle,
                    color: "text-orange-600",
                    bgColor: "bg-orange-100",
                    borderColor: "border-orange-300",
                    label: "Error",
                    description: "Backend connection error"
                }
        }
    }

    const config = getStatusConfig(status)
    const Icon = config.icon

    if (status === 'connected') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-green-50 border-green-200">
                <Icon className={`size-4 ${config.color} animate-pulse`} />
                <span className="text-sm font-medium text-green-700">{config.label}</span>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
            <Icon className={`size-4 ${config.color}`} />
            <div className="flex flex-col">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">{config.description}</span>
                {retryCount > 0 && (
                    <span className="text-xs text-muted-foreground">Retries: {retryCount}</span>
                )}
            </div>
            {onRetry && (status === 'disconnected' || status === 'error') && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="ml-auto"
                >
                    <RefreshCw className="size-3 mr-1" />
                    Retry
                </Button>
            )}
        </div>
    )
}
