// components/sources-table.tsx
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Play, Camera, Link, FileVideo, Wifi } from "lucide-react"
import type { VideoSource, SourceType } from "@/services/camera"

type Props = {
    sources: VideoSource[]
    activating: number | null
    onActivate: (id: number, type: SourceType, url: string) => void
    onDelete: (id: number) => void
}

const TYPE_ICON: Record<SourceType, React.ReactNode> = {
    webcam: <Camera className="size-3.5" />,
    rtsp: <Link className="size-3.5" />,
    mjpeg: <Wifi className="size-3.5" />,
    mp4: <FileVideo className="size-3.5" />,
}

const TYPE_LABEL: Record<SourceType, string> = {
    webcam: "Webcam",
    rtsp: "RTSP",
    mjpeg: "MJPEG",
    mp4: "MP4",
}

function toSourceType(value: string): SourceType {
    return value === "webcam" || value === "rtsp" || value === "mjpeg" || value === "mp4"
        ? value
        : "rtsp"
}

export function SourcesTable({ sources, activating, onActivate, onDelete }: Props) {
    if (sources.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <span className="text-2xl">📷</span>
                No sources saved yet. Add one above.
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>URL / Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sources.map(s => {
                    const sourceType = toSourceType(s.type)
                    return (
                    <TableRow key={s.id}>

                        <TableCell className="font-medium">{s.name}</TableCell>

                        <TableCell>
                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                {TYPE_ICON[sourceType]}
                                {TYPE_LABEL[sourceType]}
                            </span>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                            {s.url || "—"}
                        </TableCell>

                        <TableCell>
                            {s.active ? (
                                <Badge className="text-[10px] bg-green-500/15 text-green-600 border border-green-400/30 hover:bg-green-500/15">
                                    ACTIVE
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px]">
                                    IDLE
                                </Badge>
                            )}
                        </TableCell>

                        <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                                {!s.active && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-green-600 hover:text-green-700"
                                        disabled={activating === s.id}
                                        onClick={() => onActivate(s.id, sourceType, s.url)}
                                        title="Set as active source"
                                    >
                                        <Play className="size-3.5" />
                                    </Button>
                                )}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 text-destructive hover:text-destructive"
                                    onClick={() => onDelete(s.id)}
                                    title="Delete source"
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        </TableCell>

                    </TableRow>
                )})}
            </TableBody>
        </Table>
    )
}
