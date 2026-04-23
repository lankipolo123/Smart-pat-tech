import * as React from "react"

type Props = {
    children: React.ReactNode
}

export function HeaderBase({ children }: Props) {
    return (
        <div className="h-16 flex items-center justify-between px-6 border-b w-full">
            {children}
        </div>
    )
}