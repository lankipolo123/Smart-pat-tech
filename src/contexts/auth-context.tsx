import { createContext, useContext, useState, useCallback, useMemo } from "react"
import type { ReactNode } from "react"

export type AuthUser = {
    token: string
    name: string
    email: string
    joinedAt: string | null
    lastLogin: string | null
    photoURL?: string
}

export type AuthContextValue = AuthUser & {
    updateUser: (data: { firstName: string; lastName: string; email: string }) => Promise<void>
    updatePhoto: (photoURL: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
    user,
    onUpdate,
    onPhotoUpdate,
    children,
}: {
    user: AuthUser
    onUpdate: (data: { firstName: string; lastName: string; email: string }) => Promise<void>
    onPhotoUpdate: (photoURL: string) => void
    children: ReactNode
}) {
    // Memoize the context value so consumers only re-render when user
    // identity, onUpdate, or onPhotoUpdate actually change — not on
    // every parent render.
    const value = useMemo<AuthContextValue>(() => ({
        ...user,
        updateUser: onUpdate,
        updatePhoto: onPhotoUpdate,
    }), [user, onUpdate, onPhotoUpdate])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
    return ctx
}

// ─── Sidebar Context ───────────────────────────────────────────────────────────

type SidebarContextValue = {
    collapsed: boolean
    toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const toggle = useCallback(() => setCollapsed(c => !c), [])

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebarState(): SidebarContextValue {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error("useSidebarState must be used inside SidebarProvider")
    return ctx
}