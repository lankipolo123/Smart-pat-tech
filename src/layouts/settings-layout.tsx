import type { ReactNode } from "react"

type Props = {
    one: ReactNode   // profile header
    two: ReactNode   // manage account
    three: ReactNode // personal info form
}

export function SettingsLayout({ one, two, three }: Props) {
    return (
        <div className="grid grid-cols-[1fr_420px] gap-6 p-6 w-full">
            <div className="flex flex-col gap-6">
                {one}
                {three}
            </div>
            <div>
                {two}
            </div>
        </div>
    )
}