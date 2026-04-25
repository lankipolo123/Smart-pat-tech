const API_BASE = "http://localhost:8000"

export type AuthResponse = {
    access_token: string
    name: string
    email: string
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

export function saveSession(token: string, name: string, email: string) {
    localStorage.setItem("token", token)
    localStorage.setItem("userName", name)
    localStorage.setItem("userEmail", email)
}

export function loadSession(): { token: string; name: string; email: string } | null {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("userName")
    const email = localStorage.getItem("userEmail")
    if (token && name && email) return { token, name, email }
    return null
}

export function clearSession() {
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
    localStorage.removeItem("userEmail")
}
