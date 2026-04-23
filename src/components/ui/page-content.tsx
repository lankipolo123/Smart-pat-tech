import * as React from "react"

type Props = {
    children: React.ReactNode
    className?: string
}

export function PageContent({ children, className }: Props) {
    return (
        <div className={`flex flex-col gap-4 ${className ?? ""}`}>
            {children}
        </div>
    )
}