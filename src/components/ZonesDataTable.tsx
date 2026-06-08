import type { ReactNode } from "react"

import {
  MoreHorizontal,
  SquareParking,
  CircleDot,
  CircleOff,
  Trash2,
  Edit,
  Eye,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { type Zone } from "@/services/camera"

type Props = {
  zones: Zone[]

  highlightedId?: number
  activeCameraId?: number | null

  onHighlight?: (zone: Zone) => void
  onEdit?: (zone: Zone) => void
  onDelete?: (zone: Zone) => void
  onPreview?: (zone: Zone) => void

  pagination?: ReactNode
}

export function ZonesDataTable({
  zones,

  highlightedId,
  activeCameraId,

  onHighlight,
  onEdit,
  onDelete,
  onPreview,

  pagination,
}: Props) {
  const occupiedCount = zones.filter(
    (z) => z.occupied
  ).length

  const totalCount = zones.length

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zone</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Points</TableHead>
            <TableHead className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* NO CAMERA SELECTED */}
          {!activeCameraId ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-6"
              >
                Select a camera above to view its zones.
              </TableCell>
            </TableRow>
          ) : zones.length === 0 ? (
            /* NO ZONES */
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                No zones configured
              </TableCell>
            </TableRow>
          ) : (
            zones.map((zone) => (
              <TableRow
                key={zone.id}
                className={
                  highlightedId === zone.id
                    ? "bg-muted/50"
                    : ""
                }
                onClick={() => onHighlight?.(zone)}
              >
                {/* ZONE */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <SquareParking className="size-4" />
                    {zone.slot}
                  </div>
                </TableCell>

                {/* TYPE */}
                <TableCell>
                  {zone.zone_type === "entry"
                    ? "Entry"
                    : zone.zone_type === "exit"
                      ? "Exit"
                      : "Parking"}
                </TableCell>

                {/* STATUS */}
                <TableCell>
                  <div
                    className={`flex items-center gap-2 ${zone.occupied
                        ? "text-red-600"
                        : "text-green-600"
                      }`}
                  >
                    {zone.occupied ? (
                      <>
                        <CircleDot className="w-4 h-4" />
                        Occupied
                      </>
                    ) : (
                      <>
                        <CircleOff className="w-4 h-4" />
                        Free
                      </>
                    )}
                  </div>
                </TableCell>

                {/* POINTS */}
                <TableCell>
                  {zone.points?.length ?? 0} points
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
                          onClick={(e) => {
                            e.stopPropagation()
                            onHighlight?.(zone)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Highlight
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onPreview?.(zone)
                          }}
                        >
                          <SquareParking className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(zone)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuGroup>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete?.(zone)
                        }}
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

      <div className="border-t p-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {totalCount} zones total (
          {occupiedCount} occupied,{" "}
          {totalCount - occupiedCount} free)
        </span>

        {pagination}
      </div>
    </div>
  )
}