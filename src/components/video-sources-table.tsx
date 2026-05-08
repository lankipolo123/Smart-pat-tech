// components/video-sources-table.tsx
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Link, MoreHorizontal, Play, Pause, Download, Trash2, Edit, Eye } from "lucide-react"

type VideoSource = {
    id: number
    name: string
    type: string
    url: string
    active: number
}

type Props = {
    sources: VideoSource[]
    activeSource: string
    onActivate: (source: VideoSource) => void
    onDelete: (source: VideoSource) => void
    onEdit?: (source: VideoSource) => void
    onPreview?: (source: VideoSource) => void
    onDownload?: (source: VideoSource) => void
}

export function VideoSourcesTable({ 
    sources, 
    activeSource, 
    onActivate, 
    onDelete, 
    onEdit, 
    onPreview, 
    onDownload 
}: Props) {
    if (sources.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <Link className="size-8 opacity-50" />
                No video sources configured. Upload a video or add an RTSP stream.
            </div>
        )
    }

    const getSourceIcon = (type: string) => {
        switch (type) {
            case 'mp4':
                return 'Video File'
            case 'rtsp':
                return 'RTSP Stream'
            case 'webcam':
                return 'Webcam'
            default:
                return 'Unknown'
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'mp4':
                return 'bg-blue-500/10 text-blue-600 border-blue-400/20'
            case 'rtsp':
                return 'bg-purple-500/10 text-purple-600 border-purple-400/20'
            case 'webcam':
                return 'bg-green-500/10 text-green-600 border-green-400/20'
            default:
                return 'bg-gray-500/10 text-gray-600 border-gray-400/20'
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Source Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>URL/Path</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sources.map((source) => (
                    <TableRow
                        key={source.id}
                        className={`cursor-pointer ${source.name === activeSource ? "bg-primary/5" : ""}`}
                        onClick={() => onActivate(source)}
                    >
                        <TableCell className="text-muted-foreground text-xs">
                            {source.id}
                        </TableCell>

                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <Link className="size-4 text-muted-foreground" />
                                {source.name}
                            </div>
                        </TableCell>

                        <TableCell>
                            <Badge 
                                variant="outline" 
                                className={`text-[10px] ${getTypeColor(source.type)}`}
                            >
                                {getSourceIcon(source.type)}
                            </Badge>
                        </TableCell>

                        <TableCell>
                            {source.active ? (
                                <Badge variant="default" className="text-[10px] bg-green-500">
                                    ACTIVE
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px]">
                                    INACTIVE
                                </Badge>
                            )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                            {source.url}
                        </TableCell>

                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={() => (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-7"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <MoreHorizontal className="size-3.5" />
                                        </Button>
                                    )}
                                />
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onActivate(source)
                                        }}
                                    >
                                        {source.active ? (
                                            <>
                                                <Pause className="size-4 mr-2" />
                                                Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <Play className="size-4 mr-2" />
                                                Activate
                                            </>
                                        )}
                                    </DropdownMenuItem>

                                    {onPreview && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onPreview(source)
                                            }}
                                        >
                                            <Eye className="size-4 mr-2" />
                                            Preview
                                        </DropdownMenuItem>
                                    )}

                                    {onEdit && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onEdit(source)
                                            }}
                                        >
                                            <Edit className="size-4 mr-2" />
                                            Edit Source
                                        </DropdownMenuItem>
                                    )}

                                    {source.type === 'mp4' && onDownload && (
                                        <DropdownMenuItem
                                            onClick={e => {
                                                e.stopPropagation()
                                                onDownload(source)
                                            }}
                                        >
                                            <Download className="size-4 mr-2" />
                                            Download
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                        onClick={e => {
                                            e.stopPropagation()
                                            onDelete(source)
                                        }}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="size-4 mr-2" />
                                        Delete Source
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
