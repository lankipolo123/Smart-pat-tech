// components/CameraDataTable.tsx
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Camera, MoreHorizontal, Play, Settings, Edit, Trash2 } from "lucide-react"
import { type Camera as CameraDevice } from "@/services/camera"

type Props = {
  cameras: CameraDevice[]
  activeCamera?: string | null
  activeCameraId?: number | null
  onSelect?: (camera: CameraDevice) => void
  onConfigure?: (camera: CameraDevice) => void
  onEdit?: (camera: CameraDevice) => void
  onDelete?: (camera: CameraDevice) => void
}

export function CameraDataTable({
  cameras,
  activeCamera,
  activeCameraId,
  onSelect,
  onConfigure,
  onEdit,
  onDelete,
}: Props) {
  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
        <Camera className="size-8 opacity-50" />
        No cameras found. Use "Configure Camera" to add one.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Camera</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cameras.map((camera) => {
            const isActive = activeCameraId != null
              ? activeCameraId === camera.id
              : activeCamera === camera.name
            return (
              <TableRow
                key={camera.id}
                className={isActive ? "bg-primary/5" : "cursor-pointer"}
                onClick={() => onSelect?.(camera)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Camera className="size-4 text-muted-foreground" />
                    {camera.name || `Camera ${camera.id}`}
                  </div>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground capitalize">
                  {camera.camera_type.replace("_", " ")}
                </TableCell>

                <TableCell>
                  {isActive ? (
                    <Badge className="text-[10px] bg-green-500">ACTIVE</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">AVAILABLE</Badge>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); onSelect?.(camera) }}
                        >
                          <Play className="size-4 mr-2" /> Set as Active
                        </DropdownMenuItem>
                        {onConfigure && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onConfigure(camera) }}
                          >
                            <Settings className="size-4 mr-2" /> Configure
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onEdit(camera) }}
                          >
                            <Edit className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => { e.stopPropagation(); onDelete(camera) }}
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}