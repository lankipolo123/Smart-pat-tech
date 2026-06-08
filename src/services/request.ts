const DEFAULT_TIMEOUT_MS = 10_000

export class DataServiceError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message)
        this.name = "DataServiceError"
    }
}

export async function withTimeout<T>(
    request: PromiseLike<T>,
    label: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new DataServiceError(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
    })

    try {
        return await Promise.race([request, timeout])
    } finally {
        if (timer) clearTimeout(timer)
    }
}

export async function fetchJsonWithTimeout<T>(
    url: string,
    label: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
            throw new DataServiceError(`${label} failed with HTTP ${response.status}`)
        }
        return await response.json() as T
    } catch (error) {
        if (error instanceof DataServiceError) throw error
        throw new DataServiceError(`${label} request failed`, error)
    } finally {
        clearTimeout(timer)
    }
}