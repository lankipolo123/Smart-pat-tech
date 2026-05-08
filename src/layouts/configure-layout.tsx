// layouts/configure-layout.tsx

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
        <div className="w-full h-full flex flex-col p-4 lg:p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto w-full flex-1">
                {/* LEFT - Canvas Area */}
                <div className="flex min-h-0">
                    <div className="w-full max-w-2xl aspect-[4/3] bg-muted/10 rounded-xl p-4">
                        {canvas}
                    </div>
                </div>

                {/* RIGHT - Panel Area */}
                <div className="flex flex-col gap-2 min-h-0 w-full">
                    {cameraActions}
                    {cameraConfiguration}
                    {videoSourcesConfiguration}
                    {zonesConfiguration}
                </div>
            </div>
        </div>
    )
}