import type { SessionRecord } from "@/services/parking"

import {
    formatDate,
    formatDuration,
    formatFee,
    sessionLabel,
} from "./csv-export-utils"

const PRIMARY = "#003974"
const ACCENT = "#FFAE0B"

let cachedPdfMake: any = null

async function getPdfMake() {
    if (cachedPdfMake?.vfs) {
        return cachedPdfMake
    }

    const pdfMakeModule = await import(
        "pdfmake/build/pdfmake"
    )

    const pdfFontsModule = await import(
        "pdfmake/build/vfs_fonts"
    )

    const pdfMake: any =
        (pdfMakeModule as any).default ??
        pdfMakeModule

    const pdfFonts: any =
        (pdfFontsModule as any).default ??
        pdfFontsModule

    pdfMake.vfs =
        pdfFonts?.pdfMake?.vfs ??
        pdfFonts?.vfs

    cachedPdfMake = pdfMake

    return pdfMake
}

async function fetchLogoBase64(): Promise<string | null> {
    try {
        const LOGO_URL =
            "https://i.imgur.com/xDSUCZY_d.webp?maxwidth=760&fidelity=grand"

        const res = await fetch(LOGO_URL)

        if (!res.ok) return null

        const blob = await res.blob()

        const bmp =
            await createImageBitmap(blob)

        const canvas =
            document.createElement("canvas")

        canvas.width = bmp.width
        canvas.height = bmp.height

        const ctx =
            canvas.getContext("2d")

        if (!ctx) return null

        ctx.fillStyle = "#FFFFFF"

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        )

        ctx.drawImage(bmp, 0, 0)

        return canvas.toDataURL(
            "image/jpeg",
            0.9
        )
    } catch {
        return null
    }
}

async function buildDoc(
    sessions: SessionRecord[],
    range: string,
    withLogo = true
): Promise<any> {
    const now = new Date().toLocaleString(
        "en-US",
        {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }
    )

    let logoData: string | null = null

    if (withLogo) {
        logoData =
            await fetchLogoBase64()
    }

    const HEADERS = [
        "Session #",
        "Slot",
        "Entry Time",
        "Exit Time",
        "Duration",
        "Fee",
        "Status",
    ]

    const WIDTHS = [
        62,
        42,
        95,
        95,
        58,
        50,
        44,
    ]

    const headerRow = HEADERS.map(
        (h) => ({
            text: h,
            fontSize: 8,
            bold: true,
            color: "#FFFFFF",
            fillColor: PRIMARY,
            alignment: "center",
        })
    )

    const dataRows = sessions.map(
        (s, idx) => {
            const bg =
                idx % 2 === 0
                    ? "#F9FAFB"
                    : "#FFFFFF"

            const status =
                s.exit === null
                    ? "Ongoing"
                    : "Done"

            return [
                sessionLabel(s.id),
                s.slot,
                formatDate(s.entry),
                s.exit
                    ? formatDate(s.exit)
                    : "—",
                formatDuration(
                    s.durationMin
                ),
                formatFee(s.bill),
                status,
            ].map((text, ci) => {
                const isStatus = ci === 6

                return {
                    text: String(text),

                    fillColor: isStatus
                        ? status === "Ongoing"
                            ? "#D1FAE5"
                            : "#F3F4F6"
                        : bg,

                    color: isStatus
                        ? status === "Ongoing"
                            ? "#065F46"
                            : "#374151"
                        : "#1F2937",

                    fontSize: 7.5,

                    bold: isStatus,

                    alignment: "left" as const,
                }
            })
        }
    )

    return {
        pageSize: "A4",

        pageOrientation: "landscape",

        pageMargins: [40, 50, 40, 50],

        footer: (
            currentPage: number,
            pageCount: number
        ) => ({
            columns: [
                {
                    text: "Smart-Pat Parking Sessions",

                    fontSize: 7,

                    color: "#9CA3AF",

                    alignment: "left",

                    margin: [40, 8, 0, 0],
                },

                {
                    text: `Page ${currentPage} of ${pageCount}`,

                    fontSize: 7,

                    color: "#9CA3AF",

                    alignment: "right",

                    margin: [0, 8, 40, 0],
                },
            ],
        }),

        content: [
            {
                stack: [
                    logoData
                        ? {
                            image: logoData,
                            width: 48,
                            alignment: "center",
                            margin: [0, 0, 0, 6],
                        }
                        : null,

                    {
                        text: "Parking Sessions Export",

                        fontSize: 18,

                        bold: true,

                        color: PRIMARY,

                        alignment: "center",
                    },

                    {
                        text: "Smart-Pat Parking Management System",

                        fontSize: 9,

                        bold: true,

                        color: ACCENT,

                        alignment: "center",

                        margin: [0, 3, 0, 0],
                    },
                ].filter(Boolean),

                margin: [0, 0, 0, 10],
            },

            {
                canvas: [
                    {
                        type: "rect",
                        x: 0,
                        y: 0,
                        w: 515,
                        h: 3,
                        color: PRIMARY,
                    },

                    {
                        type: "rect",
                        x: 0,
                        y: 5,
                        w: 515,
                        h: 1.5,
                        color: ACCENT,
                    },
                ],

                margin: [0, 0, 0, 12],
            },

            {
                table: {
                    headerRows: 1,

                    widths: WIDTHS,

                    body: [
                        headerRow,
                        ...dataRows,
                    ],
                },

                layout: {
                    hLineWidth: (
                        i: number,
                        node: {
                            table: {
                                body: unknown[]
                            }
                        }
                    ) =>
                        i === 0 ||
                            i ===
                            node.table.body.length
                            ? 0.5
                            : 0.3,

                    vLineWidth: () => 0.3,

                    hLineColor: () =>
                        "#E5E7EB",

                    vLineColor: () =>
                        "#E5E7EB",

                    paddingLeft: () => 5,

                    paddingRight: () => 5,

                    paddingTop: () => 5,

                    paddingBottom: () => 5,
                },
            },

            {
                text: `Generated: ${now} · Range: ${range} · Total: ${sessions.length} records`,

                fontSize: 7.5,

                color: "#6B7280",

                alignment: "left",

                margin: [0, 10, 0, 0],

                italics: true,
            },
        ],
    }
}

export async function exportSessionsToPDF(
    sessions: SessionRecord[],
    range: string
): Promise<void> {
    const pdfMake =
        await getPdfMake()

    const doc = await buildDoc(
        sessions,
        range,
        true
    )

    const date = new Date()
        .toISOString()
        .split("T")[0]

    pdfMake
        .createPdf(doc)
        .download(
            `smart-pat-sessions-${range}-${date}.pdf`
        )
}

const previewCache = new Map<
    string,
    string
>()

export async function getPDFPreviewUrl(
    sessions: SessionRecord[],
    range: string
): Promise<string | null> {
    try {
        const previewSessions =
            sessions.slice(0, 5)

        const cacheKey = JSON.stringify({
            range,
            ids: previewSessions.map(
                (s) => s.id
            ),
        })

        if (previewCache.has(cacheKey)) {
            return (
                previewCache.get(
                    cacheKey
                ) ?? null
            )
        }

        const pdfMake =
            await getPdfMake()

        const doc = await buildDoc(
            previewSessions,
            range,
            false
        )

        const url =
            await new Promise<string>(
                (resolve, reject) => {
                    pdfMake
                        .createPdf(doc)
                        .getDataUrl(
                            (dataUrl: string) => {
                                if (dataUrl) {
                                    resolve(dataUrl)
                                } else {
                                    reject(
                                        new Error(
                                            "Preview generation failed"
                                        )
                                    )
                                }
                            }
                        )
                }
            )

        previewCache.set(
            cacheKey,
            url
        )

        return url
    } catch (e) {
        console.warn(
            "PDF preview failed:",
            e
        )

        return null
    }
}