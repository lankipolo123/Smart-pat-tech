const API = "http://localhost:8000"

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
        const r = await fetch(`${API}/parking/slots`)
        if (!r.ok) return []
        return r.json()
    } catch { return [] }
}

export async function fetchSessions(range: string): Promise<SessionRecord[]> {
    try {
        const r = await fetch(`${API}/parking/sessions?range=${range}`)
        if (!r.ok) return []
        const rows = await r.json()
        return rows.map((s: Record<string, unknown>) => ({
            id:          s.id,
            slot:        s.slot,
            plate:       s.plate,
            entry:       s.entry,
            exit:        s.exit ?? null,
            durationMin: s.duration_min ?? null,
            bill:        s.bill ?? null,
        }))
    } catch { return [] }
}

export async function fetchParkingStats(range: string): Promise<ParkingStats | null> {
    try {
        const r = await fetch(`${API}/parking/stats?range=${range}`)
        if (!r.ok) return null
        const row = await r.json()
        return {
            totalSessions: row.totalSessions ?? row.total_sessions ?? 0,
            totalRevenue: row.totalRevenue ?? row.total_revenue ?? 0,
            avgDuration: row.avgDuration ?? row.avg_duration_min ?? 0,
            avgCharge: row.avgCharge ?? (
                row.total_sessions ? row.total_revenue / row.total_sessions : 0
            ),
            occupancyCurrent: row.occupancyCurrent ?? row.occupied_now ?? 0,
            occupancyTotal: row.occupancyTotal ?? row.total_zones ?? 0,
            vehicleTurnover: row.vehicleTurnover ?? 0,
        }
    } catch { return null }
}
