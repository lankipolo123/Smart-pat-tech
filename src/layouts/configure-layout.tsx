import type { ReactNode } from "react"

type Props = {
    canvas: ReactNode
    cameraActions?: ReactNode
    cameraConfiguration?: ReactNode
    videoSourcesConfiguration?: ReactNode
    zonesConfiguration?: ReactNode
}

export function ConfigureLayout({
    canvas,
    cameraActions,
    cameraConfiguration,
    videoSourcesConfiguration,
    zonesConfiguration,
}: Props) {
    return (
        <div className="w-full grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4 p-4 lg:p-6 items-start">
            <div className="w-full xl:sticky xl:top-4">
                {canvas}
            </div>

            <div className="flex flex-col gap-3 w-full">
                {cameraActions}
                {cameraConfiguration}
                {videoSourcesConfiguration}
                {zonesConfiguration}
            </div>
        </div>
    )
}