import { Card, CardContent } from "@/components/ui/card"

type LegendItem = {
    label: string
    color: string
}

const LEGEND_ITEMS: LegendItem[] = [
    { label: "Free", color: "bg-green-500" },
    { label: "Occupied", color: "bg-destructive" },
    { label: "Unknown", color: "bg-yellow-400" },
]

export function ParkingStatusLegend() {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Status Legend
            </p>
            <Card size="sm">
                <CardContent className="flex flex-col gap-2 py-3">
                    {LEGEND_ITEMS.map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-2 text-sm">
                            <span className={`size-2.5 rounded-full ${color}`} />
                            <span>{label}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
