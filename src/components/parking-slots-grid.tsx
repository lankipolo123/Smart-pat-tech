// components/parking-slots-grid.tsx
import { useEffect, useState, useRef } from "react"
import { type Zone } from "@/services/camera"

type Props = {
    slots?: Zone[]
}

export function ParkingSlotsGrid({ slots: propSlots }: Props) {

    const [slots, setSlots] = useState<Zone[]>([])
    const wsRef = useRef<WebSocket | null>(null)

    // If parent passes slots as props, use those directly
    // Otherwise fall back to self-managed fetch + WS
    const displaySlots = propSlots ?? slots

    useEffect(() => {
        // Skip self-fetching if parent is controlling data
        if (propSlots !== undefined) return

        fetch("http://localhost:8000/zones")
            .then(r => r.json())
            .then(setSlots)
            .catch(() => { })

        const ws = new WebSocket("ws://localhost:8000/ws/zones")

        ws.onmessage = (event) => {
            const data: Zone[] = JSON.parse(event.data)
            setSlots(data)
        }

        wsRef.current = ws

        return () => ws.close()

    }, [propSlots])

    if (displaySlots.length === 0) {
        return (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                No zones configured yet.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-5 gap-3">
            {displaySlots.map(s => (
                <div
                    key={s.id}
                    className={`p-3 rounded-lg border transition-all duration-300 ${s.occupied
                            ? "bg-red-500/90 border-red-600 text-white"
                            : "bg-green-500/90 border-green-600 text-white"
                        }`}
                >
                    <div className="font-bold text-sm">{s.slot}</div>
                    <div className="text-xs opacity-80 mt-0.5">
                        {s.occupied ? "OCCUPIED" : "AVAILABLE"}
                    </div>
                    {s.occupied && s.entry_time && (
                        <div className="text-[10px] opacity-60 mt-1">
                            {new Date(s.entry_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}