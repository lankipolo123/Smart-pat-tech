import { Camera } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar"

type Props = {
    displayName: string
    role: string
    email: string
    status: string
    photoURL?: string
    joinedDate?: string
    lastLogin?: string
    onChangePhoto?: () => void
}

export function ProfileHeader({
    displayName,
    role,
    email,
    status,
    photoURL,
    joinedDate,
    lastLogin,
    onChangePhoto,
}: Props) {
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()

    const isOnline = status === "active"

    return (
        <Card>
            <CardContent className="flex items-center gap-4 py-4">
                <div className="relative flex-shrink-0">
                    <Avatar size="lg">
                        <AvatarImage src={photoURL} alt={displayName} />
                        <AvatarFallback>{initials}</AvatarFallback>

                    </Avatar>

                    {onChangePhoto && (
                        <button
                            onClick={onChangePhoto}
                            aria-label="Change photo"
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground ring-2 ring-background hover:bg-primary/80 transition-colors cursor-pointer"
                        >
                            <Camera className="size-2.5" />
                        </button>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">{displayName}</h2>
                        <span
                            className={`text-xs px-2 py-0.5 rounded-full ${isOnline
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                                }`}
                        >
                            {status}
                        </span>
                    </div>

                    <p className="text-sm text-muted-foreground">{role}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Joined: {joinedDate || "—"}</p>
                    <p className="text-xs text-muted-foreground">Last login: {lastLogin || "—"}</p>
                </div>
            </CardContent>
        </Card>
    )
}