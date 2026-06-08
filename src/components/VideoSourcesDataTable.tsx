import type { ReactNode } from "react"
import {
  MoreHorizontal,
  Video,
  Trash2,
  Edit,
  Download,
  Eye,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react"

import { useRef } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { CameraConfigDialog } from "./CameraConfigDialog"

type VideoSource = {
  id: number
  name: string
  type: string
  url: string
  active: number
}

type ConnectionState =
  | "live"
  | "connecting"
  | "offline"
  | "disconnected"

type Props = {
  sources: VideoSource[]
  activeSource?: string
  connectionState?: ConnectionState

  onActivate?: (source: VideoSource) => void
  onPreview?: (source: VideoSource) => void
  onEdit?: (source: VideoSource) => void
  onDelete?: (source: VideoSource) => void
  onDownload?: (source: VideoSource) => void
  onUpload?: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
  onSourceAdded?: () => void

  pagination?: ReactNode
}

export function VideoSourcesDataTable({
  sources,
  activeSource,
  connectionState,

  onActivate,
  onPreview,
  onEdit,
  onDelete,
  onDownload,
  onUpload,
  onSourceAdded,

  pagination,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sources.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                No video sources configured
              </TableCell>
            </TableRow>
          ) : (
            sources.map((source) => (
              <TableRow
                key={source.id}
                className={
                  activeSource === source.name
                    ? "bg-muted/50"
                    : ""
                }
              >
                {/* SOURCE */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Video className="size-4" />
                    {source.name}
                  </div>
                </TableCell>

                {/* TYPE */}
                <TableCell>
                  {source.type}
                </TableCell>

                {/* STATUS */}
                <TableCell>
                  {source.active === 1 ? (
                    connectionState === "live" ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Wifi className="w-3 h-3" />
                        Live
                      </div>
                    ) : connectionState === "connecting" ? (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Wifi className="w-3 h-3 animate-pulse" />
                        Connecting
                      </div>
                    ) : connectionState === "disconnected" ? (
                      <div className="flex items-center gap-2 text-red-500">
                        <WifiOff className="w-3 h-3" />
                        Disconnected
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-500">
                        <WifiOff className="w-3 h-3" />
                        Active (Offline)
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      Inactive
                    </div>
                  )}
                </TableCell>

                {/* URL */}
                <TableCell className="font-mono text-xs">
                  {source.url
                    ? source.url.substring(0, 30) +
                    (source.url.length > 30
                      ? "..."
                      : "")
                    : "N/A"}
                </TableCell>

                {/* ACTIONS */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex items-center justify-center size-8 rounded-md hover:bg-accent transition-colors"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <span className="sr-only">
                        Open menu
                      </span>

                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          Actions
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                          onClick={() =>
                            onPreview?.(source)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            onActivate?.(source)
                          }
                        >
                          <Video className="mr-2 h-4 w-4" />

                          {source.active === 1
                            ? "Active"
                            : "Activate"}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            onEdit?.(source)
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>

                        {source.type === "file" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onDownload?.(source)
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() =>
                          onDelete?.(source)
                        }
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="border-t p-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <CameraConfigDialog
            trigger={
              <span className="inline-flex items-center justify-center gap-2 px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors cursor-pointer">
                <Video className="h-4 w-4" />
                Add Camera Source
              </span>
            }
            onCameraAdded={onSourceAdded}
          />

          <input
            type="file"
            ref={fileRef}
            onChange={onUpload}
            accept="video/*"
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fileRef.current?.click()
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </div>

        {pagination}
      </div>
    </div>
  )
}