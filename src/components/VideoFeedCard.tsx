import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Camera, ChevronDown, Upload } from "lucide-react"
import { STREAM_URL } from "@/services/camera"
import { ZoneCanvas } from "./zone-canvas"
import { ZoneDrawingToolbar } from "./ZoneDrawingToolbar"
import { type Zone, type ZoneType } from "@/types"
import { type Point } from "@/hooks/useZones"

interface VideoFeedCardProps {
    zones: Zone[]
    drawing: boolean
    points: Point[]
    slotName: string
    zoneType: ZoneType
    highlightedId?: number
    saving: boolean
    cameras: any[]
    sources: any[]
    activeLabel: string
    fileRef: React.RefObject<HTMLInputElement>
    onStageClick: (e: any) => void
    onDeleteZone: (id?: number) => void
    onSlotNameChange: (value: string) => void
    onZoneTypeChange: (value: ZoneType) => void
    onUndoPoint: () => void
    onCancelDraw: () => void
    onSaveZone: () => void
    onLoadZones: () => void
    onStartDraw: () => void
    onSwitchWebcam: (index: number, name: string) => void
    onActivateSource: (source: any) => void
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function VideoFeedCard({
    zones,
    drawing,
    points,
    slotName,
    zoneType,
    highlightedId,
    saving,
    cameras,
    sources,
    activeLabel,
    fileRef,
    onStageClick,
    onDeleteZone,
    onSlotNameChange,
    onZoneTypeChange,
    onUndoPoint,
    onCancelDraw,
    onSaveZone,
    onLoadZones,
    onStartDraw,
    onSwitchWebcam,
    onActivateSource,
    onFileUpload,
}: VideoFeedCardProps) {
    return (
        <Card className="overflow-hidden w-full max-w-fit shadow-lg border-0 bg-background/95 backdrop-blur-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/20 flex-wrap">
                {/* CAMERA */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={() => (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                            >
                                <Camera className="size-3.5" />
                                {activeLabel}
                                <ChevronDown className="size-3" />
                            </Button>
                        )}
                    />

                    <DropdownMenuContent align="start" className="w-52">
                        {cameras.length > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Local Cameras
                                </DropdownMenuLabel>

                                {cameras.map((camera) => {
                                    const cameraIndex = camera.index ?? camera.id
                                    return (
                                        <DropdownMenuItem
                                            key={cameraIndex}
                                            onClick={() => onSwitchWebcam(cameraIndex, camera.name)}
                                        >
                                            <Camera className="size-3.5 mr-2" />
                                            {camera.name}
                                        </DropdownMenuItem>
                                    )
                                })}

                                <DropdownMenuSeparator />
                            </>
                        )}

                        {sources.length > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Sources
                                </DropdownMenuLabel>

                                {sources.map((source) => (
                                    <DropdownMenuItem
                                        key={source.id}
                                        onClick={() => onActivateSource(source)}
                                    >
                                        <Link className="size-3.5 mr-2" />
                                        {source.name}
                                    </DropdownMenuItem>
                                ))}

                                <DropdownMenuSeparator />
                            </>
                        )}

                        <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                            <Upload className="size-3.5 mr-2" />
                            Upload Video
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <input
                    ref={fileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={onFileUpload}
                />

                {/* DRAW */}
                <ZoneDrawingToolbar
                    drawing={drawing}
                    points={points}
                    slotName={slotName}
                    zoneType={zoneType}
                    saving={saving}
                    onSlotNameChange={onSlotNameChange}
                    onZoneTypeChange={onZoneTypeChange}
                    onUndoPoint={onUndoPoint}
                    onCancelDraw={onCancelDraw}
                    onSaveZone={onSaveZone}
                    onLoadZones={onLoadZones}
                    onStartDraw={onStartDraw}
                />
            </div>

            {/* CANVAS */}
            <ZoneCanvas
                zones={zones}
                drawingPoints={points}
                isDrawing={drawing}
                highlightedId={highlightedId}
                streamUrl={STREAM_URL}
                onStageClick={onStageClick}
                onDeleteZone={onDeleteZone}
            />
        </Card>
    )
}

import { Link } from "lucide-react"
