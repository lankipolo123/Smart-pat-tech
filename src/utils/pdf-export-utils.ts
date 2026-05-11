declare const window: Window & { pdfMake: any }

function getPdfMake() {
    const pdfMake = window.pdfMake
    if (!pdfMake) throw new Error("pdfMake is not loaded")
    return pdfMake
}

function blobFromDoc(doc: object): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        getPdfMake()
            .createPdf(doc)
            .getBlob((blob: Blob) => {
                if (blob) resolve(blob)
                else reject(new Error("getBlob returned empty"))
            })
    })
}

export async function generatePdfPreviewUrl(doc: object): Promise<string> {
    const blob = await blobFromDoc(doc)
    return URL.createObjectURL(blob)
}

export async function generatePdfBlob(doc: object): Promise<Blob> {
    return blobFromDoc(doc)
}

export async function downloadPdfBlob(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Fetch a local/remote image and return a base64 data URL via canvas (white bg) */
export async function fetchImageAsBase64(src: string): Promise<string | null> {
    try {
        const res = await fetch(src)
        if (!res.ok) return null
        const blob = await res.blob()
        const bmp = await createImageBitmap(blob)
        const canvas = document.createElement("canvas")
        canvas.width = bmp.width
        canvas.height = bmp.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return null
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(bmp, 0, 0)
        return canvas.toDataURL("image/jpeg", 0.9)
    } catch {
        return null
    }
}