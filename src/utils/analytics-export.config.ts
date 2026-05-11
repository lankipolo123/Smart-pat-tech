import ExcelJS from "exceljs"

import type { ExportConfig } from "@/utils/export-config.types"
import type { AnalyticsStats, RevenuePoint, VehiclePoint, ActivityPoint } from "@/services/analytics"
import {
    fetchAnalyticsStats,
    fetchRevenueData,
    fetchVehicleData,
    fetchActivityData,
} from "@/services/analytics"
import { fetchImageAsBase64 } from "@/utils/pdf-export-utils"

const PRIMARY = "#a33738"
const PRIMARY_X = "a33738"
const SECONDARY = "#75777a"
const LOGO_URL = "https://i.imgur.com/xDSUCZY_d.webp?maxwidth=760&fidelity=grand"

let cachedLogo: string | null = null
async function getLogo() {
    if (!cachedLogo) cachedLogo = await fetchImageAsBase64(LOGO_URL)
    return cachedLogo
}

export type AnalyticsExportData = {
    stats: AnalyticsStats
    revenue: RevenuePoint[]
    vehicles: VehiclePoint[]
    activity: ActivityPoint[]
}

// ── PDF doc builder ───────────────────────────────────────────────────────────

async function buildPdfDoc(data: AnalyticsExportData): Promise<object> {
    const { stats, revenue, vehicles, activity } = data
    const logoData = await getLogo()
    const now = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })

    const tableLayout = {
        hLineWidth: (i: number, node: any) =>
            i === 0 || i === node.table.body.length ? 0.5 : 0.3,
        vLineWidth: () => 0.3,
        hLineColor: () => "#e5e7eb",
        vLineColor: () => "#e5e7eb",
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 5,
        paddingBottom: () => 5,
    }

    const th = (text: string) => ({
        text, fontSize: 8, bold: true,
        color: "#ffffff", fillColor: PRIMARY, alignment: "center",
    })

    const td = (text: string, bg = "#ffffff") => ({
        text, fontSize: 8, color: "#0f172a",
        fillColor: bg, alignment: "center",
    })

    // Stats summary table (2 columns: label | value)
    const statRows = [
        ["Total Revenue", `₱${stats.totalRevenue.toLocaleString()}`],
        ["Total Vehicles", stats.totalVehicles.toLocaleString()],
        ["Avg Daily Revenue", `₱${stats.avgDailyRevenue.toLocaleString()}`],
        ["Avg Session Bill", `₱${stats.avgSessionBill.toFixed(2)}`],
        ["Peak Hour", stats.peakHour],
        ["Revenue Growth", `+${stats.revenueGrowthPct}%`],
    ].map(([label, value], idx) => [
        { text: label, fontSize: 8, bold: true, color: "#374151", fillColor: idx % 2 === 0 ? "#f3f4f6" : "#ffffff", alignment: "left" as const },
        { text: value, fontSize: 8, bold: false, color: "#0f172a", fillColor: idx % 2 === 0 ? "#f3f4f6" : "#ffffff", alignment: "center" as const },
    ])

    // Revenue trend table
    const revenueRows = revenue.map((r, idx) => [
        td(r.date, idx % 2 === 0 ? "#f3f4f6" : "#ffffff"),
        td(`₱${r.revenue.toLocaleString()}`, idx % 2 === 0 ? "#f3f4f6" : "#ffffff"),
    ])

    // Vehicle trend table
    const vehicleRows = vehicles.map((v, idx) => [
        td(v.date, idx % 2 === 0 ? "#f3f4f6" : "#ffffff"),
        td(v.vehicles.toLocaleString(), idx % 2 === 0 ? "#f3f4f6" : "#ffffff"),
    ])

    // Weekly activity table
    const activityRows = activity.map((a, idx) => [
        td(a.label, idx % 2 === 0 ? "#f3f4f6" : "#ffffff"),
        td(a.vehicles.toLocaleString(), idx % 2 === 0 ? "#f3f4f6" : "#ffffff"),
    ])

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
            // Header
            {
                stack: [
                    logoData ? { image: logoData, width: 48, alignment: "center", margin: [0, 0, 0, 6] } : null,
                    { text: "Analytics Export", fontSize: 18, bold: true, color: PRIMARY, alignment: "center" },
                    { text: "TechSentinel Parking Management System", fontSize: 9, bold: true, color: SECONDARY, alignment: "center", margin: [0, 3, 0, 0] },
                ].filter(Boolean),
                margin: [0, 0, 0, 10],
            },

            // Double rule
            {
                canvas: [
                    { type: "rect", x: 0, y: 0, w: 515, h: 3, color: PRIMARY },
                    { type: "rect", x: 0, y: 5, w: 515, h: 1.5, color: SECONDARY },
                ],
                margin: [0, 0, 0, 12],
            },

            { text: `Generated: ${now}`, fontSize: 8, color: "#6b7280", alignment: "right", margin: [0, 0, 0, 14] },

            // ── Summary Stats ──
            { text: "Summary", fontSize: 11, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] },
            {
                table: {
                    headerRows: 1,
                    widths: ["*", "*"],
                    body: [
                        [th("Metric"), th("Value")],
                        ...statRows,
                    ],
                },
                layout: tableLayout,
                margin: [0, 0, 0, 18],
            },

            // ── Revenue Trend + Vehicle Trend side by side ──
            { text: "Performance Trends", fontSize: 11, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] },
            {
                columns: [
                    {
                        width: "50%",
                        stack: [
                            { text: "Revenue by Date", fontSize: 9, bold: true, color: SECONDARY, margin: [0, 0, 0, 4] },
                            {
                                table: {
                                    headerRows: 1,
                                    widths: ["*", "*"],
                                    body: [[th("Date"), th("Revenue")], ...revenueRows],
                                },
                                layout: tableLayout,
                            },
                        ],
                    },
                    { width: 12, text: "" },
                    {
                        width: "50%",
                        stack: [
                            { text: "Vehicles by Date", fontSize: 9, bold: true, color: SECONDARY, margin: [0, 0, 0, 4] },
                            {
                                table: {
                                    headerRows: 1,
                                    widths: ["*", "*"],
                                    body: [[th("Date"), th("Vehicles")], ...vehicleRows],
                                },
                                layout: tableLayout,
                            },
                        ],
                    },
                ],
                margin: [0, 0, 0, 18],
            },

            // ── Weekly Activity ──
            { text: "Weekly Activity", fontSize: 11, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] },
            {
                table: {
                    headerRows: 1,
                    widths: ["*", "*"],
                    body: [[th("Day"), th("Vehicles")], ...activityRows],
                },
                layout: tableLayout,
                margin: [0, 0, 0, 0],
            },
        ],
    }
}

// ── Excel workbook builder ────────────────────────────────────────────────────

async function buildExcelWorkbook(data: AnalyticsExportData): Promise<ExcelJS.Workbook> {
    const { stats, revenue, vehicles, activity } = data
    const wb = new ExcelJS.Workbook()
    wb.creator = "Smart-Pat System"
    wb.created = new Date()

    const now = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + PRIMARY_X } }
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }
    const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" }
    const thinBorder = (argb = "FFE5E7EB"): Partial<ExcelJS.Border> => ({ style: "thin", color: { argb } })
    const allBorders = (argb = "FFE5E7EB") => ({ top: thinBorder(argb), bottom: thinBorder(argb), left: thinBorder(argb), right: thinBorder(argb) })

    function addSheet(name: string, columns: string[], rows: (string | number)[][]) {
        const ws = wb.addWorksheet(name)

        ws.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`)
        const titleCell = ws.getCell("A1")
        titleCell.value = `Smart-Pat Analytics — ${name}`
        titleCell.font = { bold: true, size: 13, color: { argb: "FF" + PRIMARY_X } }
        titleCell.alignment = centerAlign

        ws.mergeCells(`A2:${String.fromCharCode(64 + columns.length)}2`)
        const subCell = ws.getCell("A2")
        subCell.value = `Generated: ${now}`
        subCell.font = { size: 9, color: { argb: "FF6B7280" } }
        subCell.alignment = centerAlign

        ws.addRow([])

        const hRow = ws.addRow(columns)
        hRow.eachCell(cell => {
            cell.fill = headerFill
            cell.font = headerFont
            cell.alignment = centerAlign
            cell.border = allBorders("FFD1D5DB")
        })

        rows.forEach((rowData, idx) => {
            const row = ws.addRow(rowData)
            const bg = idx % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF"
            row.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
                cell.font = { size: 9.5 }
                cell.alignment = { horizontal: "center", vertical: "middle" }
                cell.border = allBorders()
            })
        })

        ws.columns = columns.map(() => ({ width: 22 }))
        return ws
    }

    // Summary sheet
    const summaryWs = wb.addWorksheet("Summary")
    summaryWs.mergeCells("A1:B1")
    const st = summaryWs.getCell("A1")
    st.value = "Smart-Pat Analytics Summary"
    st.font = { bold: true, size: 13, color: { argb: "FF" + PRIMARY_X } }
    st.alignment = centerAlign
    summaryWs.mergeCells("A2:B2")
    const ss = summaryWs.getCell("A2")
    ss.value = `Generated: ${now}`
    ss.font = { size: 9, color: { argb: "FF6B7280" } }
    ss.alignment = centerAlign
    summaryWs.addRow([])
    const shRow = summaryWs.addRow(["Metric", "Value"])
    shRow.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = centerAlign; cell.border = allBorders("FFD1D5DB") })

    const statRows = [
        ["Total Revenue", `₱${stats.totalRevenue.toLocaleString()}`],
        ["Total Vehicles", stats.totalVehicles.toLocaleString()],
        ["Avg Daily Revenue", `₱${stats.avgDailyRevenue.toLocaleString()}`],
        ["Avg Session Bill", `₱${stats.avgSessionBill.toFixed(2)}`],
        ["Peak Hour", stats.peakHour],
        ["Revenue Growth", `+${stats.revenueGrowthPct}%`],
    ]
    statRows.forEach(([label, value], idx) => {
        const row = summaryWs.addRow([label, value])
        const bg = idx % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF"
        row.eachCell(cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
            cell.font = { size: 10 }
            cell.alignment = { horizontal: "center", vertical: "middle" }
            cell.border = allBorders()
        })
    })
    summaryWs.columns = [{ width: 26 }, { width: 22 }]

    // Revenue sheet
    addSheet("Revenue Trend", ["Date", "Revenue (₱)"],
        revenue.map(r => [r.date, `₱${r.revenue.toLocaleString()}`]))

    // Vehicles sheet
    addSheet("Vehicle Trend", ["Date", "Vehicles"],
        vehicles.map(v => [v.date, v.vehicles]))

    // Activity sheet
    addSheet("Weekly Activity", ["Day", "Vehicles"],
        activity.map(a => [a.label, a.vehicles]))

    return wb
}

// ── HTML preview builder ──────────────────────────────────────────────────────

function buildPreviewHtml(data: AnalyticsExportData): string {
    const { stats, revenue, activity } = data

    const statRows = [
        ["Total Revenue", `₱${stats.totalRevenue.toLocaleString()}`],
        ["Total Vehicles", stats.totalVehicles.toLocaleString()],
        ["Avg Daily Revenue", `₱${stats.avgDailyRevenue.toLocaleString()}`],
        ["Avg Session Bill", `₱${stats.avgSessionBill.toFixed(2)}`],
        ["Peak Hour", stats.peakHour],
        ["Revenue Growth", `+${stats.revenueGrowthPct}%`],
    ].map(([l, v], i) => `<tr style="background:${i % 2 === 0 ? "#f3f4f6" : "#fff"}">
        <td style="font-weight:600;text-align:left;">${l}</td>
        <td>${v}</td>
    </tr>`).join("")

    const revenueRows = revenue.slice(0, 7).map((r, i) =>
        `<tr style="background:${i % 2 === 0 ? "#f3f4f6" : "#fff"}">
            <td>${r.date}</td><td>₱${r.revenue.toLocaleString()}</td>
        </tr>`
    ).join("")

    const activityRows = activity.map((a, i) =>
        `<tr style="background:${i % 2 === 0 ? "#f3f4f6" : "#fff"}">
            <td>${a.label}</td><td>${a.vehicles}</td>
        </tr>`
    ).join("")

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:sans-serif; background:#fff; padding:20px; color:#111827; font-size:12px; }
        .header { text-align:center; margin-bottom:14px; }
        .header img { height:36px; margin-bottom:6px; }
        .header h1 { font-size:16px; font-weight:700; color:${PRIMARY}; margin-bottom:3px; }
        .header p { font-size:10px; color:#6b7280; }
        .rule1 { height:3px; background:${PRIMARY}; margin-bottom:3px; }
        .rule2 { height:1.5px; background:${SECONDARY}; margin-bottom:16px; }
        .section-title { font-size:12px; font-weight:700; color:${PRIMARY}; margin-bottom:6px; margin-top:14px; }
        .tables { display:flex; gap:16px; }
        .tables > div { flex:1; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:${PRIMARY}; }
        thead th { color:#fff; font-size:10px; font-weight:700; padding:6px 8px; text-align:center; border-right:1px solid rgba(255,255,255,0.15); }
        tbody td { padding:5px 8px; text-align:center; border-right:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; font-size:11px; }
        .sub { font-size:10px; font-weight:600; color:${SECONDARY}; margin-bottom:4px; }
    </style>
    </head><body>
    <div class="header">
        <img src="${LOGO_URL}" alt="Logo"/>
        <h1>Analytics Export</h1>
        <p>TechSentinel Parking Management System</p>
    </div>
    <div class="rule1"></div><div class="rule2"></div>

    <div class="section-title">Summary</div>
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${statRows}</tbody></table>

    <div class="section-title">Performance Trends</div>
    <div class="tables">
        <div>
            <div class="sub">Revenue by Date (first 7)</div>
            <table><thead><tr><th>Date</th><th>Revenue</th></tr></thead>
            <tbody>${revenueRows}</tbody></table>
        </div>
        <div>
            <div class="sub">Weekly Activity</div>
            <table><thead><tr><th>Day</th><th>Vehicles</th></tr></thead>
            <tbody>${activityRows}</tbody></table>
        </div>
    </div>
    </body></html>`
}

// ── Config factory ────────────────────────────────────────────────────────────

export function createAnalyticsExportConfig(): ExportConfig<AnalyticsExportData> {
    return {
        label: "Analytics Report",

        fetchData: async () => {
            const [stats, revenue, vehicles, activity] = await Promise.all([
                fetchAnalyticsStats(),
                fetchRevenueData(),
                fetchVehicleData(),
                fetchActivityData(),
            ])
            return {
                stats: stats ?? { totalRevenue: 0, totalVehicles: 0, avgDailyRevenue: 0, avgSessionBill: 0, peakHour: "—", revenueGrowthPct: 0 },
                revenue,
                vehicles,
                activity,
            }
        },

        toPdfDoc: async (data) => buildPdfDoc(data),

        toExcelWorkbook: async (data) => buildExcelWorkbook(data),

        toPreviewHtml: (data) => buildPreviewHtml(data),

        filename: () => {
            const date = new Date().toISOString().split("T")[0]
            return `smart-pat-analytics-${date}`
        },
    }
}