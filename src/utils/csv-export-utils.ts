import type { SessionRecord } from "@/services/parking"

export function formatDate(ts: string | null): string {
    if (!ts) return "—"
    try {
        const d = new Date(ts)
        if (isNaN(d.getTime())) return "—"
        return d.toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        })
    } catch { return "—" }
}

export function formatDuration(min: number | null): string {
    if (min === null) return "—"
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatFee(bill: number | null): string {
    if (bill === null) return "—"
    return `₱${bill.toFixed(2)}`
}

export function sessionLabel(id: number): string {
    return `#${String(id).padStart(6, "0")}`
}

function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return ""
    const s = String(value)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
    }
    return s
}

export function convertToCSV(sessions: SessionRecord[]): string {
    const now = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })

    const rows: string[] = []
    rows.push(`"Smart-Pat Parking Sessions Export"`)
    rows.push(`"Generated: ${now}"`)
    rows.push(`"Total Records: ${sessions.length}"`)
    rows.push("")

    const headers = ["Session #", "Slot", "Entry Time", "Exit Time", "Duration", "Fee", "Status"]
    rows.push(headers.map(escapeCSV).join(","))

    for (const s of sessions) {
        rows.push([
            escapeCSV(sessionLabel(s.id)),
            escapeCSV(s.slot),
            escapeCSV(formatDate(s.entry)),
            escapeCSV(s.exit ? formatDate(s.exit) : "—"),
            escapeCSV(formatDuration(s.durationMin)),
            escapeCSV(formatFee(s.bill)),
            escapeCSV(s.exit === null ? "Ongoing" : "Done"),
        ].join(","))
    }

    rows.push("")
    rows.push(`"End of Report — ${sessions.length} records exported"`)
    return rows.join("\n")
}

export function downloadCSV(content: string, filename: string): void {
    const BOM = "﻿"
    const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export function generateCSVFilename(range: string): string {
    const date = new Date().toISOString().split("T")[0]
    return `smart-pat-sessions-${range}-${date}.csv`
}
