const API_BASE = "http://localhost:8000"

export type AuthResponse = {
    access_token: string
    name: string
    email: string
    joined_at: string | null
    last_login: string | null
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Invalid email or password")
    }
    return res.json()
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Registration failed")
    }
    return res.json()
}

export function saveSession(
    token: string,
    name: string,
    email: string,
    joinedAt: string | null,
    lastLogin: string | null
) {
    localStorage.setItem("token", token)
    localStorage.setItem("userName", name)
    localStorage.setItem("userEmail", email)
    if (joinedAt) localStorage.setItem("joinedAt", joinedAt)
    if (lastLogin) localStorage.setItem("lastLogin", lastLogin)
}

export function loadSession() {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("userName")
    const email = localStorage.getItem("userEmail")
    if (!token || !name || !email) return null
    return {
        token,
        name,
        email,
        joinedAt: localStorage.getItem("joinedAt"),
        lastLogin: localStorage.getItem("lastLogin"),
    }
}

export function clearSession() {
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("joinedAt")
    localStorage.removeItem("lastLogin")
}
