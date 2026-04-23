export type User = {
    displayName: string
    role: string
    email: string
    status: "active" | "offline" | "suspended"
    photoURL?: string
    joinedDate?: string
    lastLogin?: string
    firstName?: string
    lastName?: string
    contact?: string
    address?: string
}