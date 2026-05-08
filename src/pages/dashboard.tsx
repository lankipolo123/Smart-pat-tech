import { useCallback, useEffect, useRef, useState } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { DashboardContentLayout } from "@/layouts/dashboard-content-layout"
import { DashboardCCTVFeedCard } from "@/components/DashboardCCTVFeedCard"
import { ActiveAlerts } from "@/components/active-alerts"
import { ParkingSummary } from "@/components/parking-summary"
import { DashboardSlotsGrid } from "@/components/DashboardSlotsGrid"
import { BackendStatus } from "@/components/backend-status"
import { useCameraState } from "@/hooks/useCameraState"

import { type Zone } from "@/services/camera"

type Point = [number, number]

function nextBackoff(current: number): number {
    return Math.min(current * 2, 30_000)
}

export function DashboardPage() {
    const cameraHook = useCameraState()

    const [zones, setZones] = useState<Zone[]>([])
    const [backendStatus, setBackendStatus] = useState<
        'connecting' | 'connected' | 'disconnected' | 'error'
    >('connecting')
    const [retryCount, setRetryCount] = useState(0)

    const retryDelayRef = useRef(1_000)
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const unmountedRef = useRef(false)

    const clearRetryTimer = () => {
        if (retryTimerRef.current !== null) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = null
        }
    }

    const connectWebSocket = useCallback(() => {
        if (unmountedRef.current) return

        if (wsRef.current) {
            wsRef.current.onclose = null
            wsRef.current.close()
            wsRef.current = null
        }

        setBackendStatus('connecting')

        const ws = new WebSocket("ws://localhost:8000/ws/zones")
        wsRef.current = ws

        ws.onopen = () => {
            if (unmountedRef.current) { ws.close(); return }
            setBackendStatus('connected')
            retryDelayRef.current = 1_000
            setRetryCount(0)
        }

        ws.onmessage = (event) => {
            try {
                const data: Zone[] = JSON.parse(event.data)
                setZones(data)
            } catch {
                // malformed frame — ignore
            }
        }

        ws.onerror = () => setBackendStatus('error')

        ws.onclose = () => {
            if (unmountedRef.current) return
            setBackendStatus('disconnected')
            setRetryCount(prev => prev + 1)
            const delay = retryDelayRef.current
            retryDelayRef.current = nextBackoff(delay)
            retryTimerRef.current = setTimeout(connectWebSocket, delay)
        }
    }, [])

    useEffect(() => {
        unmountedRef.current = false
        connectWebSocket()
        return () => {
            unmountedRef.current = true
            clearRetryTimer()
            if (wsRef.current) {
                wsRef.current.onclose = null
                wsRef.current.close()
                wsRef.current = null
            }
        }
    }, [connectWebSocket])

    const handleRetry = useCallback(() => {
        clearRetryTimer()
        retryDelayRef.current = 1_000
        connectWebSocket()
    }, [connectWebSocket])

    const handleZoneDrawn = useCallback(async (points: Point[], slotName: string) => {
        try {
            const res = await fetch("http://localhost:8000/zones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slot: slotName, points }),
            })
            if (!res.ok) throw new Error("Failed to save zone")
        } catch (err) {
            console.error("Zone save error:", err)
        }
    }, [])

    return (
        <>
            <PageHeader
                title="Dashboard"
                description="Real-time occupancy monitoring"
                extra={
                    <BackendStatus
                        status={backendStatus}
                        retryCount={retryCount}
                        onRetry={handleRetry}
                    />
                }
            />
            <PageContent>
                <DashboardContentLayout
                    feed={
                        <DashboardCCTVFeedCard
                            onZoneDrawn={handleZoneDrawn}
                            parkingSlots={zones.length}
                            detections={zones.filter(z => z.occupied).length}
                            activeCamera={cameraHook.activeCamera}
                            activeCameraId={cameraHook.activeCameraId}
                            cameras={cameraHook.cameras}
                            onCameraSwitch={cameraHook.switchCamera}
                            connectionState={cameraHook.connectionState}
                            connectionMessage={
                                cameraHook.cameraStatus?.simulation_mode
                                    ? "No camera connected. Configure or activate a camera."
                                    : null
                            }
                        />
                    }
                    alerts={<ActiveAlerts />}
                    summary={
                        <ParkingSummary
                            data={{
                                totalSpaces: zones.length,
                                occupied: zones.filter(z => z.occupied).length,
                                available: zones.filter(z => !z.occupied).length,
                                totalVehicles: zones.filter(z => z.occupied).length,
                            }}
                        />
                    }
                    slots={<DashboardSlotsGrid slots={zones} />}
                />
            </PageContent>
        </>
    )
}
