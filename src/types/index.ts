// types/index.ts
export type Point = {
    x: number
    y: number
}

export type CameraDevice = {
    index: number
    name: string
}

export type VideoSource = {
    id: number
    name: string
    type: string
    url: string
    active: number
}

export type ZoneType = "parking" | "entry" | "exit"

export type Zone = {
    id?: number
    slot: string
    points: number[][]
    zone_type?: ZoneType
    occupied?: boolean
    entry_time?: string | null
}
