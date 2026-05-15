// hooks/useCameraState.ts
import { useState, useCallback, useEffect } from "react"
import {
    fetchCameras,
    fetchCameraStatus,
    deleteCamera as deleteCameraApi,
    activateCamera as activateCameraApi,
    type Camera,
    type CameraStatus,
    type CameraConnectionState,
} from "@/services/camera"

export function useCameraState() {
    const [cameras, setCameras] = useState<Camera[]>([])
    const [activeCameraId, setActiveCameraId] = useState<number | null>(null)
    const [activeCamera, setActiveCamera] = useState<string | null>(null)
    const [connectionState, setConnectionState] = useState<CameraConnectionState>("connecting")
    const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null)

    const reloadCameras = useCallback(async () => {
        const list = await fetchCameras()
        setCameras(list)

        const active = list.find(c => c.is_active === 1) ?? null
        if (active) {
            setActiveCameraId(active.id)
            setActiveCamera(active.name)
        } else {
            setActiveCameraId(null)
            setActiveCamera(null)
        }
    }, [])

    useEffect(() => {
        reloadCameras()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const reloadStatus = useCallback(async () => {
        const status = await fetchCameraStatus()

        // Only update cameraStatus state if the value actually changed —
        // prevents unnecessary re-renders from the 2s polling interval.
        setCameraStatus(prev =>
            JSON.stringify(prev) === JSON.stringify(status) ? prev : status
        )

        const next: CameraConnectionState = !status
            ? "disconnected"
            : status.simulation_mode
                ? "disconnected"
                : status.connected
                    ? "live"
                    : status.opened
                        ? "connecting"
                        : "disconnected"

        // Only update connectionState if it actually changed.
        setConnectionState(prev => prev === next ? prev : next)
    }, [])

    useEffect(() => {
        reloadStatus()
        const timer = setInterval(reloadStatus, 2000)
        return () => clearInterval(timer)
    }, [reloadStatus])

    const switchCamera = useCallback(async (cameraId: number) => {
        try {
            await activateCameraApi(cameraId)
            const target = cameras.find((camera) => camera.id === cameraId)
            setActiveCameraId(cameraId)
            setActiveCamera(target?.name ?? null)
            await reloadCameras()
            await reloadStatus()
        } catch (error) {
            console.error("Failed to switch camera:", error)
            setConnectionState("disconnected")
        }
    }, [cameras, reloadCameras, reloadStatus])

    const deleteCamera = useCallback(async (id: number) => {
        try {
            await deleteCameraApi(id)
            await reloadCameras()
            await reloadStatus()
        } catch (error) {
            console.error("Failed to delete camera:", error)
        }
    }, [reloadCameras, reloadStatus])

    return {
        cameras,
        activeCamera,
        activeCameraId,
        switchCamera,
        reloadCameras,
        reloadStatus,
        deleteCamera,
        connectionState,
        cameraStatus,
    }
}