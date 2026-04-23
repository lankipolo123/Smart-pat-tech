import { Calendar, Clock } from "lucide-react"

export const pageHeaderConfig = {
    showUserInfo: true,

    icons: {
        dateIcon: Calendar,
        timeIcon: Clock,
    },

    date: {
        locale: "en-US",
        format: {
            month: "short",
            day: "numeric",
        },
    },

    user: {
        greeting: "Hi, Welcome",
        name: "",
        role: "",
        avatar: "",
    },
} as const