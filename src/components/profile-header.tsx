import { Card, CardContent } from "@/components/ui/card"
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    AvatarBadge,
} from "@/components/ui/avatar"

type Props = {
    displayName: string
    role: string
    email: string
    status: string
    photoURL?: string
    joinedDate?: string
    lastLogin?: string
}

export function ProfileHeader({
    displayName,
    role,
    email,
    status,
    photoURL,
    joinedDate,
    lastLogin,
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
                <Avatar size="lg">
                    <AvatarImage src={photoURL} alt={displayName} />
                    <AvatarFallback>{initials}</AvatarFallback>
                    <AvatarBadge
                        className={isOnline ? "bg-green-500" : "bg-gray-400"}
                    />
                </Avatar>

                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            {displayName}
                        </h2>

                        <span
                            className={`text-xs px-2 py-0.5 rounded-full ${isOnline
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                        >
                            {status}
                        </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {role}
                    </p>

                    <p className="text-sm text-muted-foreground">
                        {email}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                        Joined: {joinedDate || "—"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                        Last login: {lastLogin || "—"}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}