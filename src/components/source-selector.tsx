// components/source-selector.tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Camera, Link, FileVideo, Wifi } from "lucide-react"
import type { Camera as CameraDevice, SourceType } from "@/services/camera"

type Props = {
    // form state
    sourceType: SourceType
    sourceName: string
    sourceUrl: string
    uploadFile: File | null
    webcamIndex: number
    availableCameras: CameraDevice[]
    adding: boolean

    // callbacks
    onTypeChange: (t: SourceType) => void
    onNameChange: (v: string) => void
    onUrlChange: (v: string) => void
    onFileChange: (f: File | null) => void
    onWebcamIndexChange: (i: number) => void
    onAdd: () => void
    onCancel: () => void
}

const TYPE_ICONS: Record<SourceType, React.ReactNode> = {
    webcam: <Camera className="size-3.5" />,
    rtsp: <Link className="size-3.5" />,
    mjpeg: <Wifi className="size-3.5" />,
    mp4: <FileVideo className="size-3.5" />,
}

const TYPE_LABELS: Record<SourceType, string> = {
    webcam: "Webcam / USB",
    rtsp: "RTSP / IP Camera",
    mjpeg: "MJPEG Stream",
    mp4: "MP4 File",
}

export function SourceSelector({
    sourceType,
    sourceName,
    sourceUrl,
    uploadFile,
    webcamIndex,
    availableCameras,
    adding,
    onTypeChange,
    onNameChange,
    onUrlChange,
    onFileChange,
    onWebcamIndexChange,
    onAdd,
    onCancel,
}: Props) {
    return (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">

            {/* Type tabs */}
            <div className="flex flex-wrap gap-1.5">
                {(["webcam", "rtsp", "mjpeg", "mp4"] as SourceType[]).map(t => (
                    <button
                        key={t}
                        onClick={() => onTypeChange(t)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
                            ${sourceType === t
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                            }`}
                    >
                        {TYPE_ICONS[t]}
                        {TYPE_LABELS[t]}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Name */}
                <div className="space-y-1">
                    <Label className="text-xs">Display Name</Label>
                    <Input
                        value={sourceName}
                        onChange={e => onNameChange(e.target.value)}
                        placeholder="e.g. Entrance Cam"
                        className="h-8 text-sm"
                    />
                </div>

                {/* URL input — rtsp / mjpeg */}
                {(sourceType === "rtsp" || sourceType === "mjpeg") && (
                    <div className="space-y-1">
                        <Label className="text-xs">
                            {sourceType === "rtsp" ? "RTSP URL" : "MJPEG URL"}
                        </Label>
                        <Input
                            value={sourceUrl}
                            onChange={e => onUrlChange(e.target.value)}
                            placeholder={
                                sourceType === "rtsp"
                                    ? "rtsp://192.168.1.x:554/stream"
                                    : "http://192.168.1.x:8080/video"
                            }
                            className="h-8 text-sm font-mono"
                        />
                    </div>
                )}

                {/* Webcam index select */}
                {sourceType === "webcam" && (
                    <div className="space-y-1">
                        <Label className="text-xs">Camera Device</Label>
                        {availableCameras.length > 0 ? (
                            <Select
                                value={String(webcamIndex)}
                                onValueChange={v => onWebcamIndexChange(Number(v))}
                            >
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCameras.map(c => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-2 h-8">
                                <Badge variant="outline" className="text-[10px]">
                                    No cameras detected
                                </Badge>
                            </div>
                        )}
                    </div>
                )}

                {/* MP4 file */}
                {sourceType === "mp4" && (
                    <div className="space-y-1">
                        <Label className="text-xs">Video File</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="video/mp4,video/*"
                                className="hidden"
                                id="mp4-upload"
                                onChange={e => onFileChange(e.target.files?.[0] ?? null)}
                            />
                            <label
                                htmlFor="mp4-upload"
                                className="flex-1 h-8 flex items-center gap-2 px-3 border rounded-md text-xs cursor-pointer hover:bg-muted transition-colors truncate"
                            >
                                <FileVideo className="size-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate text-muted-foreground">
                                    {uploadFile ? uploadFile.name : "Choose file…"}
                                </span>
                            </label>
                        </div>
                    </div>
                )}

            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <Button
                    size="sm"
                    onClick={onAdd}
                    disabled={adding || !sourceName.trim()}
                >
                    {adding ? "Adding…" : "Add Source"}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>

        </div>
    )
}
