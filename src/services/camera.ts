const API_BASE = "http://localhost:8000"

export const STREAM_URL = `${API_BASE}/video`

export type Camera = { index: number; name: string }

export async function fetchCameras(): Promise<Camera[]> {
    try {
        const res = await fetch(`${API_BASE}/cameras`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function switchToWebcam(index: number): Promise<void> {
    await fetch(`${API_BASE}/webcam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
    })
}

export async function connectToUrl(url: string): Promise<void> {
    await fetch(`${API_BASE}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    })
}
