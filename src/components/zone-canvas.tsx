// components/zone-canvas.tsx
import { Fragment } from "react"
import { Stage, Layer, Line, Circle, Text } from "react-konva"
import { MapPin } from "lucide-react"
import type { Zone } from "@/services/camera"

const CANVAS_W = 640
const CANVAS_H = 480

type Point = { x: number; y: number }

type Props = {
    zones: Zone[]
    drawingPoints: Point[]
    isDrawing: boolean
    highlightedId: number | undefined
    streamUrl: string
    onStageClick: (e: any) => void
    onDeleteZone: (id?: number) => void
}

export function ZoneCanvas({
    zones,
    drawingPoints,
    isDrawing,
    highlightedId,
    streamUrl,
    onStageClick,
    onDeleteZone,
}: Props) {
    return (
        <div
            className="relative bg-black rounded-b-lg overflow-hidden"
            style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%" }}
        >
            {/* Live feed */}
            <img
                src={streamUrl}
                className="absolute inset-0 w-full h-full object-fill"
                alt="Live feed"
            />

            {/* Drawing hint overlay */}
            {isDrawing && (
                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1.5 pointer-events-none">
                    <MapPin className="size-3" />
                    Click to place points • {drawingPoints.length} placed
                </div>
            )}

            {/* Konva overlay */}
            <Stage
                width={CANVAS_W}
                height={CANVAS_H}
                onClick={onStageClick}
                className="absolute inset-0"
                style={{ cursor: isDrawing ? "crosshair" : "default" }}
            >
                <Layer>

                    {/* Saved zones */}
                    {zones.map(z => {
                        const isHighlighted = z.id === highlightedId
                        const color = z.occupied ? "#ef4444" : "#22c55e"
                        return (
                            <Fragment key={z.id}>
                                <Line
                                    points={z.points.flat()}
                                    closed
                                    stroke={color}
                                    strokeWidth={isHighlighted ? 4 : 2}
                                    fill={color}
                                    fillEnabled={isHighlighted}
                                    fillOpacity={0.15}
                                    opacity={isHighlighted ? 1 : 0.8}
                                />
                                <Text
                                    x={(z.points[0]?.[0] ?? 0) + 4}
                                    y={(z.points[0]?.[1] ?? 0) - 16}
                                    text={`${z.slot} ${z.occupied ? "●" : "○"}`}
                                    fill={color}
                                    fontSize={11}
                                    fontStyle="bold"
                                />
                                {/* Delete dot — click to remove */}
                                <Circle
                                    x={z.points[0]?.[0]}
                                    y={z.points[0]?.[1]}
                                    radius={6}
                                    fill="#ef4444"
                                    onClick={(e) => {
                                        e.cancelBubble = true
                                        onDeleteZone(z.id)
                                    }}
                                />
                            </Fragment>
                        )
                    })}

                    {/* In-progress drawing */}
                    {drawingPoints.length > 0 && (
                        <Line
                            points={drawingPoints.flatMap(p => [p.x, p.y])}
                            stroke="#facc15"
                            strokeWidth={2}
                            dash={[6, 3]}
                        />
                    )}
                    {drawingPoints.map((p, i) => (
                        <Circle key={i} x={p.x} y={p.y} radius={5} fill="#facc15" />
                    ))}

                </Layer>
            </Stage>
        </div>
    )
}
