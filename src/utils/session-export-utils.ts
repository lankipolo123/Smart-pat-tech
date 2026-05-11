import ExcelJS from "exceljs"

import type { ExportConfig } from "@/utils/export-config.types"
import type { SessionRecord } from "@/services/parking"
import { fetchSessions } from "@/services/parking"
import { fetchImageAsBase64 } from "@/utils/pdf-export-utils"

import {
    formatDate,
    formatDuration,
    formatFee,
    sessionLabel,
} from "@/utils/csv-export-utils"

const PRIMARY = "#a33738"
const PRIMARY_X = "a33738"
const SECONDARY = "#75777a"
const LOGO_URL = "https://i.imgur.com/xDSUCZY_d.webp?maxwidth=760&fidelity=grand"

let cachedLogo: string | null = null
async function getLogo() {
    if (!cachedLogo) cachedLogo = await fetchImageAsBase64(LOGO_URL)
    return cachedLogo
}

// ── shared helpers ────────────────────────────────────────────────────────────

function headerRow() {
    return ["Session #", "Slot", "Entry Time", "Exit Time", "Duration", "Fee", "Status"]
        .map(h => ({
            text: h, fontSize: 8, bold: true,
            color: "#ffffff", fillColor: PRIMARY, alignment: "center",
        }))
}

function dataRows(sessions: SessionRecord[]) {
    return sessions.map((s, idx) => {
        const bg = idx % 2 === 0 ? "#f3f4f6" : "#ffffff"
        const status = s.exit === null ? "Ongoing" : "Done"

        return [
            sessionLabel(s.id),
            s.slot,
            formatDate(s.entry),
            s.exit ? formatDate(s.exit) : "—",
            formatDuration(s.durationMin),
            formatFee(s.bill),
            status,
        ].map((text, ci) => {
            const isStatus = ci === 6
            return {
                text: String(text),
                fillColor: isStatus ? (status === "Ongoing" ? "#d1fae5" : "#f3f4f6") : bg,
                color: isStatus ? (status === "Ongoing" ? "#065f46" : "#374151") : "#0f172a",
                fontSize: 7.5,
                bold: isStatus,
                alignment: "center" as const,
            }
        })
    })
}

// ── PDF doc builder ───────────────────────────────────────────────────────────

async function buildPdfDoc(sessions: SessionRecord[], range: string): Promise<object> {
    const logoData = await getLogo()
    const now = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })

    return {
        pageSize: "A4",
        pageOrientation: "portrait",
        pageMargins: [40, 50, 40, 50],

        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: "TechSentinel Parking Management System", fontSize: 7, color: "#9ca3af", alignment: "left", margin: [40, 8, 0, 0] },
                { text: `Page ${currentPage} of ${pageCount}`, fontSize: 7, color: "#9ca3af", alignment: "right", margin: [0, 8, 40, 0] },
            ],
        }),

        content: [
            {
                stack: [
                    logoData ? { image: logoData, width: 48, alignment: "center", margin: [0, 0, 0, 6] } : null,
                    { text: "Parking Sessions Export", fontSize: 18, bold: true, color: PRIMARY, alignment: "center" },
                    { text: "TechSentinel Parking Management System", fontSize: 9, bold: true, color: SECONDARY, alignment: "center", margin: [0, 3, 0, 0] },
                ].filter(Boolean),
                margin: [0, 0, 0, 10],
            },
            {
                canvas: [
                    { type: "rect", x: 0, y: 0, w: 515, h: 3, color: PRIMARY },
                    { type: "rect", x: 0, y: 5, w: 515, h: 1.5, color: SECONDARY },
                ],
                margin: [0, 0, 0, 12],
            },
            {
                text: `Generated: ${now}  ·  Range: ${range}  ·  Total: ${sessions.length} records`,
                fontSize: 8, color: "#6b7280", alignment: "right", margin: [0, 0, 0, 8],
            },
            {
                alignment: "center",
                table: {
                    headerRows: 1,
                    widths: ["auto", "auto", "*", "*", "auto", "auto", "auto"],
                    body: [headerRow(), ...dataRows(sessions)],
                },
                layout: {
                    hLineWidth: (i: number, node: any) =>
                        i === 0 || i === node.table.body.length ? 0.5 : 0.3,
                    vLineWidth: () => 0.3,
                    hLineColor: () => "#e5e7eb",
                    vLineColor: () => "#e5e7eb",
                    paddingLeft: () => 5,
                    paddingRight: () => 5,
                    paddingTop: () => 5,
                    paddingBottom: () => 5,
                },
            },
        ],
    }
}

// ── Excel workbook builder ────────────────────────────────────────────────────

async function buildExcelWorkbook(sessions: SessionRecord[], range: string): Promise<ExcelJS.Workbook> {
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
    titleCell.font = { bold: true, size: 14, color: { argb: "FF" + PRIMARY_X } }
    titleCell.alignment = { horizontal: "center" }

    ws.mergeCells("A2:G2")
    const subCell = ws.getCell("A2")
    subCell.value = `Generated: ${now} · Range: ${range} · Total: ${sessions.length} records`
    subCell.font = { size: 9, color: { argb: "FF6B7280" } }
    subCell.alignment = { horizontal: "center" }

    ws.addRow([])

    const hRow = ws.addRow(["Session #", "Slot", "Entry Time", "Exit Time", "Duration", "Fee", "Status"])
    hRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + PRIMARY_X } }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = { top: { style: "thin", color: { argb: "FFD1D5DB" } }, bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, left: { style: "thin", color: { argb: "FFD1D5DB" } }, right: { style: "thin", color: { argb: "FFD1D5DB" } } }
    })

    sessions.forEach((s, idx) => {
        const status = s.exit === null ? "Ongoing" : "Done"
        const row = ws.addRow([
            sessionLabel(s.id), s.slot,
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
            cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } }
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
        { width: 14 }, { width: 10 }, { width: 22 },
        { width: 22 }, { width: 14 }, { width: 12 }, { width: 10 },
    ]

    ws.addRow([])
    const footerRow = ws.addRow([`Smart-Pat · ${sessions.length} records`])
    footerRow.getCell(1).font = { size: 8, color: { argb: "FF75777a" }, italic: true }
    ws.mergeCells(`A${footerRow.number}:G${footerRow.number}`)
    ws.autoFilter = { from: "A4", to: "G4" }

    return wb
}

// ── HTML preview builder ──────────────────────────────────────────────────────

function buildPreviewHtml(sessions: SessionRecord[], range: string): string {
    const preview = sessions.slice(0, 5)
    const now = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })

    const rows = preview.map((s, idx) => {
        const status = s.exit === null ? "Ongoing" : "Done"
        const bg = idx % 2 === 0 ? "#f3f4f6" : "#ffffff"
        const statusStyle = status === "Ongoing"
            ? "background:#d1fae5;color:#065f46;"
            : "background:#f3f4f6;color:#374151;"

        return `<tr style="background:${bg};">
            <td>${sessionLabel(s.id)}</td>
            <td>${s.slot}</td>
            <td>${formatDate(s.entry)}</td>
            <td>${s.exit ? formatDate(s.exit) : "—"}</td>
            <td>${formatDuration(s.durationMin)}</td>
            <td>${formatFee(s.bill)}</td>
            <td><span style="${statusStyle}border-radius:4px;padding:2px 8px;font-weight:700;font-size:11px;">${status}</span></td>
        </tr>`
    }).join("")

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:sans-serif; background:#fff; padding:20px; color:#111827; }
        .header { text-align:center; margin-bottom:14px; }
        .header img { height:36px; margin-bottom:6px; }
        .header h1 { font-size:16px; font-weight:700; color:${PRIMARY}; margin-bottom:3px; }
        .header p { font-size:10px; color:#6b7280; }
        .rule1 { height:3px; background:${PRIMARY}; margin-bottom:3px; }
        .rule2 { height:1.5px; background:${SECONDARY}; margin-bottom:12px; }
        .meta { display:flex; justify-content:space-between; font-size:10px; color:#6b7280; margin-bottom:8px; font-style:italic; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:${PRIMARY}; }
        thead th { color:#fff; font-size:10px; font-weight:700; padding:7px 8px; text-align:center; border-right:1px solid rgba(255,255,255,0.15); border-bottom:2px solid ${SECONDARY}; }
        tbody td { padding:6px 8px; text-align:center; border-right:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; color:#0f172a; font-size:11px; }
    </style>
    </head><body>
    <div class="header">
        <img src="${LOGO_URL}" alt="Logo"/>
        <h1>Parking Sessions Export</h1>
        <p>TechSentinel Parking Management System</p>
        <p style="margin-top:3px;">Generated: ${now}</p>
    </div>
    <div class="rule1"></div><div class="rule2"></div>
    <div class="meta">
        <span>Preview — first ${preview.length} of ${sessions.length} rows</span>
        <span>Range: ${range}</span>
    </div>
    <table>
        <thead><tr>
            <th>Session #</th><th>Slot</th><th>Entry Time</th>
            <th>Exit Time</th><th>Duration</th><th>Fee</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>
    </body></html>`
}

// ── Config factory ────────────────────────────────────────────────────────────

export type SessionExportData = {
    sessions: SessionRecord[]
    range: string
}

export function createSessionExportConfig(range: string): ExportConfig<SessionExportData> {
    return {
        label: `Sessions — ${range}`,

        fetchData: async () => ({
            sessions: await fetchSessions(range),
            range,
        }),

        toPdfDoc: async ({ sessions, range }) =>
            buildPdfDoc(sessions, range),

        toExcelWorkbook: async ({ sessions, range }) =>
            buildExcelWorkbook(sessions, range),

        toPreviewHtml: ({ sessions, range }) =>
            buildPreviewHtml(sessions, range),

        filename: ({ range }) => {
            const date = new Date().toISOString().split("T")[0]
            return `smart-pat-sessions-${range}-${date}`
        },
    }
}