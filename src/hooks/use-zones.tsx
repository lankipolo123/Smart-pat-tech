import { useEffect, useRef, useState } from "react"

export type Zone = {
    id?: number
    slot: string
    points: number[][]
    occupied?: boolean
    entry_time?: string | null
}

export function useZones() {
    const [zones, setZones] = useState<Zone[]>([])
    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        load()
        connect()

        return () => wsRef.current?.close()
    }, [])

    async function load() {
        const res = await fetch("http://localhost:8000/zones")
        const data = await res.json()
        setZones(data)
    }

    function connect() {
        const ws = new WebSocket("ws://localhost:8000/ws/zones")

        ws.onmessage = (event) => {
            const updates = JSON.parse(event.data)

            setZones(prev =>
                prev.map(z => {
                    const u = updates.find((x: Zone) => x.slot === z.slot)
                    return u ? { ...z, ...u } : z
                })
            )
        }

        wsRef.current = ws
    }

    return { zones, setZones, refresh: load }
}