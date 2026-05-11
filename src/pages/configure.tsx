import { useEffect } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { ConfigureLayout } from "@/layouts/configure-layout"
import { DashboardCCTVFeedCard } from "@/components/DashboardCCTVFeedCard"
import { CameraDataTable } from "@/components/CameraDataTable"
import { VideoSourcesDataTable } from "@/components/VideoSourcesDataTable"
import { ZonesDataTable } from "@/components/ZonesDataTable"
import { CameraConfigDialog } from "@/components/CameraConfigDialog"
import { Camera as CameraIcon } from "lucide-react"
import { useZones } from "@/hooks/useZones"
import { useVideoSources } from "@/hooks/useVideoSources"
import { useCameraState } from "@/hooks/useCameraState"

export default function ConfigurePage() {
    const zonesHook = useZones()
    const videoSourcesHook = useVideoSources()
    const cameraHook = useCameraState()

    useEffect(() => {
        zonesHook.loadZones()
        videoSourcesHook.loadCameras()
        videoSourcesHook.loadSources()
        cameraHook.reloadCameras()
        cameraHook.reloadStatus()
    }, [])

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
                            detections={zonesHook.zones.filter(z => z.occupied).length}
                            parkingSlots={zonesHook.zones.length}
                            onRefresh={() => cameraHook.reloadCameras()}
                            onZoneDrawn={(points, slotName) => zonesHook.createZoneFromDraw(points, slotName)}
                            activeCamera={cameraHook.activeCamera}
                            activeCameraId={cameraHook.activeCameraId}
                            cameras={cameraHook.cameras}
                            onCameraSwitch={cameraHook.switchCamera}
                            connectionState={cameraHook.connectionState}
                            connectionMessage={
                                cameraHook.cameraStatus?.simulation_mode
                                    ? "No camera connected. Add or activate a source below."
                                    : null
                            }
                        />
                    }
                    cameraActions={
                        <CameraConfigDialog
                            trigger={
                                <span className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors cursor-pointer">
                                    <CameraIcon className="h-4 w-4" />
                                    Configure Camera
                                </span>
                            }
                            onCameraAdded={() => cameraHook.reloadCameras()}
                        />
                    }
                    cameraConfiguration={
                        <CameraDataTable
                            cameras={cameraHook.cameras}
                            activeCamera={cameraHook.activeCamera}
                            activeCameraId={cameraHook.activeCameraId}
                            onSelect={(camera) => cameraHook.switchCamera(camera.id)}
                            onConfigure={(camera) => console.log('Configuring camera:', camera.name)}
                            onEdit={(camera) => console.log('Editing camera:', camera.name)}
                            onDelete={(camera) => cameraHook.deleteCamera(camera.id)}
                        />
                    }
                    videoSourcesConfiguration={
                        <VideoSourcesDataTable
                            sources={videoSourcesHook.sources}
                            activeSource={videoSourcesHook.activeLabel}
                            onActivate={(source) => videoSourcesHook.activateSource(source)}
                            onPreview={(source) => videoSourcesHook.activateSource(source)}
                            onEdit={(source) => console.log('Editing source:', source.name)}
                            onDelete={(source) => videoSourcesHook.deleteSource(source.id)}
                            onDownload={(source) => console.log('Downloading source:', source.name)}
                            onUpload={videoSourcesHook.handleFileUpload}
                            onSourceAdded={() => {
                                videoSourcesHook.loadSources()
                                cameraHook.reloadCameras()
                            }}
                        />
                    }
                    zonesConfiguration={
                        <ZonesDataTable
                            zones={zonesHook.zones}
                            highlightedId={zonesHook.highlightedId}
                            onHighlight={zonesHook.handleHighlight}
                            onEdit={(zone) => console.log('Editing zone:', zone.slot)}
                            onDelete={(zone) => zonesHook.deleteZone(zone.id)}
                            onPreview={(zone) => console.log('Previewing zone:', zone.slot)}
                        />
                    }
                />
            </PageContent>
        </>
    )
}
