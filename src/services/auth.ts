const API_BASE = "http://localhost:8000"

export type AuthResponse = {
    access_token: string
    name: string
    email: string
    joined_at: string | null
    last_login: string | null
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

export async function updateProfile(
    token: string,
    payload: UpdateProfilePayload
): Promise<UpdateProfileResponse> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to update profile")
    }
    return res.json()
}

export async function changeEmail(
    token: string,
    newEmail: string,
    password: string
): Promise<{ email: string }> {
    const res = await fetch(`${API_BASE}/auth/email`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail, password }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to update email")
    }
    return res.json()
}

export async function changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/password`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to change password")
    }
}

export async function deactivateAccount(token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to deactivate account")
    }
}

export async function deleteAccount(token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to delete account")
    }
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

export async function uploadAvatar(token: string, file: File): Promise<{ photoURL: string }> {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`${API_BASE}/auth/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to upload photo")
    }
    return res.json()
}