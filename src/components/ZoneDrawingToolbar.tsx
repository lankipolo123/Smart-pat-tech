import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { PenLine, Save, Undo2, X } from "lucide-react"
import { type ZoneType } from "@/types"

interface ZoneDrawingToolbarProps {
    drawing: boolean
    points: any[]
    slotName: string
    zoneType: ZoneType
    saving: boolean
    onSlotNameChange: (value: string) => void
    onZoneTypeChange: (value: ZoneType) => void
    onUndoPoint: () => void
    onCancelDraw: () => void
    onSaveZone: () => void
    onLoadZones: () => void
    onStartDraw: () => void
}

export function ZoneDrawingToolbar({
    drawing,
    points,
    slotName,
    zoneType,
    saving,
    onSlotNameChange,
    onZoneTypeChange,
    onUndoPoint,
    onCancelDraw,
    onSaveZone,
    onLoadZones,
    onStartDraw,
}: ZoneDrawingToolbarProps) {
    return (
        <div className="flex items-center gap-1.5">
            {drawing ? (
                <>
                    <Select
                        value={zoneType}
                        onValueChange={(value: ZoneType | null) => {
                            if (value) onZoneTypeChange(value)
                        }}
                    >
                        <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="parking">🅿️ Parking</SelectItem>
                            <SelectItem value="entry">🔵 Entry</SelectItem>
                            <SelectItem value="exit">🔴 Exit</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        value={slotName}
                        onChange={(e) => onSlotNameChange(e.target.value)}
                        placeholder="A1"
                        className="h-7 w-24 text-xs"
                    />

                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={onUndoPoint}
                    >
                        <Undo2 className="size-3.5" />
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={onCancelDraw}
                    >
                        <X className="size-3.5" />
                    </Button>

                    <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onSaveZone}
                        disabled={saving || points.length < 3 || !slotName.trim()}
                    >
                        <Save className="size-3.5 mr-1" />
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={onLoadZones}
                    >
                        <RefreshCw className="size-3.5" />
                    </Button>

                    <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onStartDraw}
                    >
                        <PenLine className="size-3.5 mr-1" />
                        Draw Zone
                    </Button>
                </>
            )}
        </div>
    )
}

import { RefreshCw } from "lucide-react"
