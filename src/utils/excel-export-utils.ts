import ExcelJS from "exceljs"

export async function downloadExcelWorkbook(
    workbook: ExcelJS.Workbook,
    filename: string,
): Promise<void> {
    const buf = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.xlsx`
    a.style.visibility = "hidden"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function openHtmlInNewTab(html: string): void {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 5000)
}