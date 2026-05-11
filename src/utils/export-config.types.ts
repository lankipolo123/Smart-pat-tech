import type ExcelJS from "exceljs"

export type ExportData = Record<string, unknown>

export type PreviewType = "pdf" | "html"

export type ExportConfig<T extends ExportData = ExportData> = {
    /** Shown in the dialog title */
    label: string

    /** Fetches whatever data this export needs */
    fetchData: () => Promise<T>

    /** Builds the pdfmake doc definition from fetched data */
    toPdfDoc: (data: T) => Promise<object>

    /** Builds an ExcelJS workbook from fetched data */
    toExcelWorkbook: (data: T) => Promise<ExcelJS.Workbook>

    /** Builds an HTML string for the Excel preview iframe */
    toPreviewHtml: (data: T) => string

    /** Download filename (no extension) */
    filename: (data: T) => string
}