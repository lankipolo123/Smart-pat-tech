"use client"

import { useEffect, useState, memo } from "react"
import { pageHeaderConfig as cfg } from "@/configs/page-header-configs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"

const LiveClock = memo(function LiveClock() {
    const DateIcon = cfg.icons.dateIcon
    const TimeIcon = cfg.icons.timeIcon

    const [time, setTime] = useState("")
    const [date, setDate] = useState("")

    useEffect(() => {
        const update = () => {
            const now = new Date()
            setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
            setDate(now.toLocaleDateString(cfg.date.locale, {
                month: cfg.date.format.month,
                day: cfg.date.format.day,
            }))
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <>
            <div className="flex items-center gap-1">
                <DateIcon className="size-4" />
                <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
                <TimeIcon className="size-4" />
                <span>{time}</span>
            </div>
        </>
    )
})

type Props = {
    title: string
    description?: string
    extra?: React.ReactNode
}

export function PageHeader({ title, description, extra }: Props) {
    const { name, email, photoURL } = useAuth()

    const initials = name?.charAt(0)?.toUpperCase() ?? "?"

    return (
        <div className="sticky top-0 z-30 w-full h-[87px] px-8 border-b border-secondary/40 bg-background flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-medium tracking-wide text-primary uppercase">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-secondary">{description}</p>
                )}
            </div>

            <div className="flex items-center gap-4 text-sm text-foreground/70">
                {extra && <div className="mr-2">{extra}</div>}

                {cfg.showUserInfo && (
                    <>
                        <LiveClock />
                        <span className="opacity-40">/</span>
                        <Avatar className="size-10">
                            <AvatarImage src={photoURL} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="leading-tight">
                            <div className="text-sm font-medium text-primary">{name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{email ?? "—"}</div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}