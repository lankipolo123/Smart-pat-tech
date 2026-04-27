export function formatDateTime(ts: string | null): string {
    if (!ts) return "—"
    try {
        return new Date(ts).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        })
    } catch { return ts }
}

export function formatDuration(min: number | null): string {
    if (min === null) return "—"
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function buildPageNumbers(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, "…", total]
    if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total]
    return [1, "…", current - 1, current, current + 1, "…", total]
}