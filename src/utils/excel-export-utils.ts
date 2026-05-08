import ExcelJS from "exceljs"
import type { SessionRecord } from "@/services/parking"
import { formatDate, formatDuration, formatFee, sessionLabel } from "./csv-export-utils"

const PRIMARY = "003974"
const ACCENT  = "FFAE0B"

export async function exportSessionsToExcel(sessions: SessionRecord[], range: string): Promise<void> {
    const wb = new ExcelJS.Workbook()
    wb.creator = "Smart-Pat System"
    wb.created = new Date()

    const ws = wb.addWorksheet("Parking Sessions", {
        pageSetup: { paperSize: 9, orientation: "landscape" },
    })

    const now = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })

    ws.mergeCells("A1:G1")
    const titleCell = ws.getCell("A1")
    titleCell.value = "Smart-Pat Parking Sessions Export"
    titleCell.font = { bold: true, size: 14, color: { argb: "FF" + PRIMARY } }
    titleCell.alignment = { horizontal: "center" }

    ws.mergeCells("A2:G2")
    const subCell = ws.getCell("A2")
    subCell.value = `Generated: ${now}  ·  Range: ${range}  ·  Total: ${sessions.length} records`
    subCell.font = { size: 9, color: { argb: "FF6B7280" } }
    subCell.alignment = { horizontal: "center" }

    ws.addRow([])

    const headerRow = ws.addRow([
        "Session #", "Slot", "Entry Time", "Exit Time", "Duration", "Fee", "Status",
    ])
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + PRIMARY } }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = {
            top:    { style: "thin", color: { argb: "FFD1D5DB" } },
            bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
            left:   { style: "thin", color: { argb: "FFD1D5DB" } },
            right:  { style: "thin", color: { argb: "FFD1D5DB" } },
        }
    })

    sessions.forEach((s, idx) => {
        const status = s.exit === null ? "Ongoing" : "Done"
        const row = ws.addRow([
            sessionLabel(s.id),
            s.slot,
            formatDate(s.entry),
            s.exit ? formatDate(s.exit) : "—",
            formatDuration(s.durationMin),
            formatFee(s.bill),
            status,
        ])

        const bg = idx % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF"
        row.eachCell(cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
            cell.font = { size: 9.5 }
            cell.alignment = { vertical: "middle" }
            cell.border = {
                top:    { style: "thin", color: { argb: "FFE5E7EB" } },
                bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
                left:   { style: "thin", color: { argb: "FFE5E7EB" } },
                right:  { style: "thin", color: { argb: "FFE5E7EB" } },
            }
        })

        const statusCell = row.getCell(7)
        if (status === "Ongoing") {
            statusCell.font = { bold: true, color: { argb: "FF065F46" }, size: 9.5 }
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }
        } else {
            statusCell.font = { bold: true, color: { argb: "FF374151" }, size: 9.5 }
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }
        }
        statusCell.alignment = { horizontal: "center", vertical: "middle" }
    })

    ws.columns = [
        { width: 14 }, // Session #
        { width: 10 }, // Slot
        { width: 22 }, // Entry
        { width: 22 }, // Exit
        { width: 14 }, // Duration
        { width: 12 }, // Fee
        { width: 10 }, // Status
    ]

    ws.addRow([])
    const footerRow = ws.addRow([`Smart-Pat  ·  ${sessions.length} records`])
    footerRow.getCell(1).font = { size: 8, color: { argb: "FF" + ACCENT }, italic: true }
    ws.mergeCells(`A${footerRow.number}:G${footerRow.number}`)

    ws.autoFilter = { from: "A4", to: "G4" }

    const buf  = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href     = url
    link.download = `smart-pat-sessions-${range}-${new Date().toISOString().split("T")[0]}.xlsx`
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
