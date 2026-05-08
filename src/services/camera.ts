// services/camera.ts
// Single source of truth for all camera/zone/source API calls.

import type { Zone, ZoneType, VideoSource } from '@/types'

const API_BASE = "http://localhost:8000"

export const STREAM_URL = `${API_BASE}/video`

// ─────────────────────────────
// TYPES (service-specific only)
// ─────────────────────────────
export type CameraType = "rtsp" | "ip_camera" | "usb" | "video_file"

export type CameraConfig = {
    cameraType?: CameraType
    cameraName?: string
    rtspUrl?: string
    rtspUser?: string
    rtspPassword?: string
    rtspPort?: string
    rtspTransport?: string
    rtspPaths?: string
    cameraIp?: string
    cameraId?: string
    cameraMac?: string
    videoFile?: string
    usbDevice?: string
}

export type Camera = {
    id: number
    name: string
    camera_type: CameraType
    config: CameraConfig
    created_at: string
    updated_at: string
    is_active: number
}

export type SourceType = "webcam" | "rtsp" | "mjpeg" | "mp4"
export type CameraConnectionState = "connecting" | "live" | "disconnected"

export type CameraStatus = {
    connected: boolean
    simulation_mode: boolean
    opened: boolean
    has_frame: boolean
    frame_age_seconds: number | null
    source: {
        type: string | null
        url: string | null
        camera_id: number | null
    }
}

export type { Zone, ZoneType, VideoSource }

// ─────────────────────────────
// CAMERAS CRUD
// ─────────────────────────────
export async function fetchCameras(): Promise<Camera[]> {
    try {
        const res = await fetch(`${API_BASE}/cameras`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function createCamera(
    config: CameraConfig
): Promise<{ id: number; message: string }> {
    const defaultName = config.cameraType === "rtsp" ? "RTSP Camera"
        : config.cameraType === "ip_camera" ? "IP Camera"
            : config.cameraType === "usb" ? "USB Camera"
                : config.cameraType === "video_file" ? "Video File"
                    : "Camera"

    const res = await fetch(`${API_BASE}/cameras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: config.cameraName?.trim() || defaultName,
            camera_type: config.cameraType,
            config,
        }),
    })
    if (!res.ok) throw new Error("Failed to create camera")
    return res.json()
}

export async function updateCamera(
    id: number,
    config: CameraConfig
): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/cameras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: config.cameraName ?? "",
            camera_type: config.cameraType,
            config,
        }),
    })
    if (!res.ok) throw new Error("Failed to update camera")
    return res.json()
}

export async function deleteCamera(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/cameras/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete camera")
    return res.json()
}

// ─────────────────────────────
// ACTIVE SOURCE SWITCHING
// ─────────────────────────────

export async function switchToWebcam(index: number): Promise<void> {
    const res = await fetch(`${API_BASE}/webcam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
    })
    if (!res.ok) throw new Error("Failed to switch webcam")
    const data = await res.json()
    if (!data.ok) throw new Error("Failed to open webcam")
}

export async function connectToUrl(url: string): Promise<void> {
    const res = await fetch(`${API_BASE}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    })
    if (!res.ok) throw new Error("Failed to connect URL")
    const data = await res.json()
    if (!data.ok) throw new Error("Failed to open URL")
}

export async function activateCamera(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/cameras/${id}/activate`, {
        method: "POST",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.ok === false) {
        throw new Error(data.detail || "Failed to activate camera")
    }
}

export async function fetchCameraStatus(): Promise<CameraStatus | null> {
    try {
        const res = await fetch(`${API_BASE}/camera/status`)
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

export async function uploadVideo(file: File): Promise<void> {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${API_BASE}/upload-video`, { method: "POST", body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.ok === false) throw new Error(data.detail || "Failed to upload video")
}

// ─────────────────────────────
// SAVED VIDEO SOURCES CRUD
// ─────────────────────────────
export async function fetchSources(): Promise<VideoSource[]> {
    try {
        const res = await fetch(`${API_BASE}/sources`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function createSource(
    data: Omit<VideoSource, "id" | "active">
): Promise<void> {
    const res = await fetch(`${API_BASE}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to create source")
}

export async function deleteSource(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/sources/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete source")
}

export async function activateSource(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/sources/${id}/activate`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.ok === false) throw new Error(data.detail || "Failed to activate source")
}

// ─────────────────────────────
// ZONES CRUD
// ─────────────────────────────
export async function fetchZones(): Promise<Zone[]> {
    try {
        const res = await fetch(`${API_BASE}/zones`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function createZone(
    slot: string,
    points: number[][],
    zone_type?: ZoneType
): Promise<{ id: number }> {
    const res = await fetch(`${API_BASE}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, points, zone_type }),
    })
    if (!res.ok) throw new Error("Failed to create zone")
    return res.json()
}

export async function updateZone(
    id: number,
    slot: string,
    points: number[][],
    zone_type?: ZoneType
): Promise<void> {
    const res = await fetch(`${API_BASE}/zones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, points, zone_type }),
    })
    if (!res.ok) throw new Error("Failed to update zone")
}

export async function deleteZone(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/zones/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete zone")
}
