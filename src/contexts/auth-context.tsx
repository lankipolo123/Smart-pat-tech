import { createContext, useContext, ReactNode } from "react"

export type AuthUser = {
    name: string
    email: string
    joinedAt: string | null
    lastLogin: string | null
}

const AuthContext = createContext<AuthUser | null>(null)

export function AuthProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthUser {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
    return ctx
}
