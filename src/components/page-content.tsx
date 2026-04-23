import * as React from "react"

type Props = {
    children: React.ReactNode
}

export function PageContent({ children }: Props) {
    return (
        <div className="w-full flex flex-col">
            {children}
        </div>
    )
}