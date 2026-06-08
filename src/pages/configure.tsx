import { useEffect, useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"

import { ConfigureLayout } from "@/layouts/configure-layout"

import { DashboardCCTVFeedCard } from "@/components/DashboardCCTVFeedCard"
import { CameraDataTable } from "@/components/CameraDataTable"
import { VideoSourcesDataTable } from "@/components/VideoSourcesDataTable"
import { ZonesDataTable } from "@/components/ZonesDataTable"

import { CameraConfigDialog } from "@/components/CameraConfigDialog"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"

import { SectionTitle } from "@/components/section-title"

import { Camera as CameraIcon } from "lucide-react"

import { useZones } from "@/hooks/useZones"
import { useVideoSources } from "@/hooks/useVideoSources"
import { useCameraState } from "@/hooks/useCameraState"
import { usePagination } from "@/hooks/usePagination"

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    PaginationLink,
} from "@/components/ui/pagination"

const CAMERAS_PER_PAGE = 5
const SOURCES_PER_PAGE = 5
const ZONES_PER_PAGE = 5

function TablePagination({
    page,
    totalPages,
    hasPrev,
    hasNext,
    setPage,
}: {
    page: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
    setPage: (p: number) => void
}) {
    if (totalPages <= 1) return null

    return (
        <Pagination className="justify-end">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() =>
                            hasPrev && setPage(page - 1)
                        }
                        className={
                            !hasPrev
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                        }
                    />
                </PaginationItem>

                {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                ).map((p) => (
                    <PaginationItem key={p}>
                        <PaginationLink
                            isActive={p === page}
                            onClick={() => setPage(p)}
                            className="cursor-pointer"
                        >
                            {p}
                        </PaginationLink>
                    </PaginationItem>
                ))}

                <PaginationItem>
                    <PaginationNext
                        onClick={() =>
                            hasNext && setPage(page + 1)
                        }
                        className={
                            !hasNext
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                        }
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}

export default function ConfigurePage() {
    const zonesHook = useZones()
    const videoSourcesHook = useVideoSources()
    const cameraHook = useCameraState()

    const [deleteDialog, setDeleteDialog] =
        useState<{
            open: boolean
            type:
            | "camera"
            | "source"
            | "zone"
            | null
            id: number | null
            name: string
        }>({
            open: false,
            type: null,
            id: null,
            name: "",
        })

    const cameraPagination = usePagination(
        cameraHook.cameras,
        CAMERAS_PER_PAGE
    )

    const sourcesPagination = usePagination(
        videoSourcesHook.sources,
        SOURCES_PER_PAGE
    )

    const zonesPagination = usePagination(
        zonesHook.zones,
        ZONES_PER_PAGE
    )

    useEffect(() => {
        videoSourcesHook.loadCameras()
        videoSourcesHook.loadSources()

        cameraHook.reloadCameras()
        cameraHook.reloadStatus()
    }, [])

    useEffect(() => {
        zonesHook.loadZones(cameraHook.activeCameraId)
    }, [cameraHook.activeCameraId, zonesHook.loadZones])

    async function activateVideoSource(source: Parameters<typeof videoSourcesHook.activateSource>[0]) {
        await videoSourcesHook.activateSource(source)
        await cameraHook.reloadCameras()
        await cameraHook.reloadStatus()
        await zonesHook.loadZones(source.camera_id ?? cameraHook.activeCameraId)
    }

    function confirmDeleteCamera(
        id: number | undefined,
        name: string
    ) {
        setDeleteDialog({
            open: true,
            type: "camera",
            id: id ?? null,
            name,
        })
    }

    function confirmDeleteSource(
        id: number | undefined,
        name: string
    ) {
        setDeleteDialog({
            open: true,
            type: "source",
            id: id ?? null,
            name,
        })
    }

    function confirmDeleteZone(
        id: number | undefined,
        name: string
    ) {
        setDeleteDialog({
            open: true,
            type: "zone",
            id: id ?? null,
            name,
        })
    }

    async function executeDelete() {
        if (
            deleteDialog.id == null ||
            deleteDialog.type == null
        ) {
            return
        }

        try {
            switch (deleteDialog.type) {
                case "camera":
                    await cameraHook.deleteCamera(
                        deleteDialog.id
                    )
                    break

                case "source":
                    await videoSourcesHook.deleteSource(
                        deleteDialog.id
                    )
                    break

                case "zone":
                    await zonesHook.deleteZone(
                        deleteDialog.id,
                        cameraHook.activeCameraId
                    )
                    break
            }
        } catch (error) {
            console.error(
                "Failed to delete:",
                error
            )
        } finally {
            setDeleteDialog({
                open: false,
                type: null,
                id: null,
                name: "",
            })
        }
    }

    return (
        <>
            <PageHeader
                title="Camera Configurations"
                description="Set up parking zones, cameras, and video sources"
            />

            <PageContent>
                <ConfigureLayout
                    canvas={
                        <DashboardCCTVFeedCard
                            title="Camera Feed"
                            description="Live CCTV feed for zone configuration"
                            detections={
                                zonesHook.zones.filter(
                                    (z) => z.occupied
                                ).length
                            }
                            parkingSlots={
                                zonesHook.zones.length
                            }
                            onRefresh={() =>
                                cameraHook.reloadCameras()
                            }
                            onZoneDrawn={(
                                points,
                                slotName
                            ) =>
                                zonesHook.createZoneFromDraw(
                                    points,
                                    slotName,
                                    "parking",
                                    cameraHook.activeCameraId
                                )
                            }
                            activeCamera={
                                cameraHook.activeCamera
                            }
                            activeCameraId={
                                cameraHook.activeCameraId
                            }
                            cameras={cameraHook.cameras}
                            onCameraSwitch={
                                cameraHook.switchCamera
                            }
                            connectionState={
                                cameraHook.connectionState
                            }
                            connectionMessage={
                                cameraHook.cameraStatus
                                    ?.simulation_mode
                                    ? "No camera connected. Add or activate a source below."
                                    : null
                            }
                        />
                    }

                    cameraActions={
                        <div className="flex items-start justify-between gap-4">
                            <SectionTitle
                                title="Cameras"
                                description="Manage and activate camera devices"
                            />

                            <CameraConfigDialog
                                trigger={
                                    <span className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors cursor-pointer shrink-0">
                                        <CameraIcon className="h-4 w-4" />
                                        Configure Camera
                                    </span>
                                }
                                onCameraAdded={() =>
                                    cameraHook.reloadCameras()
                                }
                            />
                        </div>
                    }

                    cameraConfiguration={
                        <CameraDataTable
                            cameras={
                                cameraPagination.paginated
                            }
                            activeCamera={
                                cameraHook.activeCamera
                            }
                            activeCameraId={
                                cameraHook.activeCameraId
                            }
                            connectionState={
                                cameraHook.connectionState
                            }
                            onSelect={(camera) =>
                                cameraHook.switchCamera(
                                    camera.id
                                )
                            }
                            onConfigure={(camera) =>
                                console.log(
                                    "Configuring camera:",
                                    camera.name
                                )
                            }
                            onEdit={(camera) =>
                                console.log(
                                    "Editing camera:",
                                    camera.name
                                )
                            }
                            onDelete={(camera) =>
                                confirmDeleteCamera(
                                    camera.id,
                                    camera.name
                                )
                            }
                            pagination={
                                <TablePagination
                                    {...cameraPagination}
                                />
                            }
                        />
                    }

                    videoSourcesConfiguration={
                        <>
                            <SectionTitle
                                title="Video Sources"
                                description="Manage saved video streams and uploads"
                            />

                            <VideoSourcesDataTable
                                sources={
                                    sourcesPagination.paginated
                                }
                                activeSource={
                                    videoSourcesHook.activeLabel
                                }
                                connectionState={
                                    cameraHook.connectionState
                                }
                                onActivate={(source) =>
                                    activateVideoSource(source)
                                }
                                onPreview={(source) =>
                                    activateVideoSource(source)
                                }
                                onEdit={(source) =>
                                    console.log(
                                        "Editing source:",
                                        source.name
                                    )
                                }
                                onDelete={(source) =>
                                    confirmDeleteSource(
                                        source.id,
                                        source.name
                                    )
                                }
                                onDownload={(source) =>
                                    console.log(
                                        "Downloading source:",
                                        source.name
                                    )
                                }
                                onUpload={
                                    videoSourcesHook.handleFileUpload
                                }
                                onSourceAdded={() => {
                                    videoSourcesHook.loadSources()
                                    cameraHook.reloadCameras()
                                }}
                                pagination={
                                    <TablePagination
                                        {...sourcesPagination}
                                    />
                                }
                            />
                        </>
                    }

                    zonesConfiguration={
                        <>
                            <SectionTitle
                                title="Parking Zones"
                                description={
                                    cameraHook.activeCamera
                                        ? `Zones for: ${cameraHook.activeCamera}`
                                        : "No camera selected"
                                }
                            />

                            <ZonesDataTable
                                zones={
                                    zonesPagination.paginated
                                }
                                highlightedId={
                                    zonesHook.highlightedId
                                }
                                activeCameraId={
                                    cameraHook.activeCameraId
                                }
                                onHighlight={
                                    zonesHook.handleHighlight
                                }
                                onEdit={(zone) =>
                                    console.log(
                                        "Editing zone:",
                                        zone.slot
                                    )
                                }
                                onDelete={(zone) =>
                                    confirmDeleteZone(
                                        zone.id,
                                        zone.slot
                                    )
                                }
                                onPreview={(zone) =>
                                    console.log(
                                        "Previewing zone:",
                                        zone.slot
                                    )
                                }
                                pagination={
                                    <TablePagination
                                        {...zonesPagination}
                                    />
                                }
                            />
                        </>
                    }
                />

                <ConfirmDeleteDialog
                    open={deleteDialog.open}
                    type={deleteDialog.type}
                    name={deleteDialog.name}
                    onCancel={() =>
                        setDeleteDialog((prev) => ({
                            ...prev,
                            open: false,
                        }))
                    }
                    onConfirm={executeDelete}
                />
            </PageContent>
        </>
    )
}
