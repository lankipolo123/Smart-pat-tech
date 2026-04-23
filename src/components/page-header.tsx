"use client"

import { useEffect, useState } from "react"
import { pageHeaderConfig as cfg } from "@/configs/page-header-configs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type Props = {
    title: string
    description?: string
    user?: {
        name: string
        role: string
        avatar?: string
    }
}

export function PageHeader({ title, description, user }: Props) {
    const [time, setTime] = useState("")
    const [date, setDate] = useState("")

    const safeUser = user ?? {
        name: "No User",
        role: "—",
        avatar: "",
    }

    const DateIcon = cfg.icons.dateIcon
    const TimeIcon = cfg.icons.timeIcon

    useEffect(() => {
        const update = () => {
            const now = new Date()

            setTime(
                now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            )

            setDate(
                now.toLocaleDateString(cfg.date.locale, {
                    month: cfg.date.format.month,
                    day: cfg.date.format.day,
                })
            )
        }

        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full min-h-[87px] px-8 py-4 border-b flex items-center justify-between overflow-hidden">

            {/* TITLE + DESCRIPTION */}
            <div className="flex flex-col gap-0.5">
                <h1 className="text-3xl font-medium tracking-wide text-primary uppercase">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>

            {/* RIGHT SIDE */}
            {cfg.showUserInfo && (
                <div className="flex items-center gap-4 text-sm text-foreground/70">

                    {/* DATE */}
                    <div className="flex items-center gap-1">
                        <DateIcon className="size-4" />
                        <span>{date}</span>
                    </div>

                    {/* TIME */}
                    <div className="flex items-center gap-1">
                        <TimeIcon className="size-4" />
                        <span>{time}</span>
                    </div>

                    <span className="opacity-40">/</span>

                    {/* AVATAR */}
                    <Avatar className="size-10">
                        <AvatarImage src={safeUser.avatar} />
                        <AvatarFallback>
                            {safeUser.name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>

                    {/* USER INFO */}
                    <div className="leading-tight">

                        <div className="text-sm font-medium text-primary">
                            {safeUser.name}
                        </div>

                        <div className="text-xs text-muted-foreground">
                            {safeUser.role}
                        </div>

                    </div>

                </div>
            )}

        </div>
    )
}