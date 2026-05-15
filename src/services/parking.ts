import { fetchJsonWithTimeout, withTimeout } from "@/services/request"

const FASTAPI_BASE = "http://localhost:8000"

// ── Types (identical shapes to before) ───────────────────────────────────────
export type SlotStatus = "available" | "occupied" | "reserved"

export type ParkingSlot = {
    id: number
    slot: string
    status: SlotStatus
    plate: string | null
    since: string | null
}

export type SessionRecord = {
    id: number
    slot: string
    plate: string
    entry: string
    exit: string | null
    durationMin: number | null
    bill: number | null
}

export type ParkingStats = {
    totalSessions: number
    totalRevenue: number
    avgDuration: number
    avgCharge: number
    occupancyCurrent: number
    occupancyTotal: number
    vehicleTurnover: number
}

export async function fetchSlots(): Promise<ParkingSlot[]> {
    try {
        return await fetchJsonWithTimeout<ParkingSlot[]>(
            `${FASTAPI_BASE}/parking/slots`,
            "Parking slots",
            3_000,
        )
    } catch (error) {
        console.warn("[parking] Failed to fetch slots", error)
        return []
    }
}

// ── Sessions — Supabase ───────────────────────────────────────────────────────
export async function fetchSessions(range: string): Promise<SessionRecord[]> {
    const rows = await withTimeout(
        fetchJsonWithTimeout<Array<SessionRecord & { duration_min?: number | null }>>(
            `${FASTAPI_BASE}/parking/sessions?range=${encodeURIComponent(range)}`,
            "Parking sessions",
        ),
        "Parking sessions",
    )

    return rows.map((s) => ({
        id: s.id,
        slot: s.slot,
        plate: s.plate,
        entry: s.entry,
        exit: s.exit ?? null,
        durationMin: s.durationMin ?? s.duration_min ?? null,
        bill: s.bill ?? null,
    }))
}

export async function fetchParkingStats(range: string): Promise<ParkingStats | null> {
    return withTimeout(
        fetchJsonWithTimeout<ParkingStats>(
            `${FASTAPI_BASE}/parking/stats?range=${encodeURIComponent(range)}`,
            "Parking stats",
        ),
        "Parking stats",
    )
}
