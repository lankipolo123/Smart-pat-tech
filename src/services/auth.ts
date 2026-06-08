const API_BASE = "/api"

export type AuthResponse = {
    access_token: string
    name: string
    email: string
    joined_at: string | null
    last_login: string | null
    avatar_url?: string | null
}

export type UpdateProfilePayload = {
    firstName: string
    lastName: string
    email: string
}

export type UpdateProfileResponse = {
    firstName: string
    lastName: string
    email: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...init?.headers,
        },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.detail || data.message || "Request failed")
    }
    return data as T
}

export function loginUser(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    })
}

export function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
    })
}

export function updateProfile(
    token: string,
    payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> {
    return request<UpdateProfileResponse>("/auth/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
}

export function changeEmail(
    token: string,
    newEmail: string,
    password: string,
): Promise<{ email: string }> {
    return request<{ email: string }>("/auth/email", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail, password }),
    })
}

export function changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    return request<void>("/auth/password", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
    })
}

export function deactivateAccount(token: string): Promise<void> {
    return request<void>("/auth/deactivate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    })
}

export function deleteAccount(token: string): Promise<void> {
    return request<void>("/auth/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    })
}

export function uploadAvatar(token: string, file: File): Promise<{ photoURL: string }> {
    const form = new FormData()
    form.append("file", file)
    return request<{ photoURL: string }>("/auth/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    })
}

export function saveSession(
    token: string,
    name: string,
    email: string,
    joinedAt: string | null,
    lastLogin: string | null,
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
        photoURL: localStorage.getItem("userPhotoURL") || undefined,
    }
}

export function clearSession() {
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("joinedAt")
    localStorage.removeItem("lastLogin")
}
