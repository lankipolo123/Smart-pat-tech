import { useState } from "react"

import LoginPage from "@/pages/login"
import SignUpPage from "@/pages/signup"
import { DashboardPage } from "@/pages/dashboard"
import { HistoryPage } from "@/pages/history"
import { AnalyticsPage } from "@/pages/analytics"
import { CCTVPage } from "@/pages/cctv"
import { SettingsPage } from "@/pages/settings"

import { AppSidebar } from "@/components/app-sidebar"

const API = "http://localhost:8000"

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [authPage, setAuthPage] = useState<"login" | "signup">("login")
  const [active, setActive] = useState("dashboard")
  const [authError, setAuthError] = useState("")

  const handleLogin = async (email: string, password: string) => {
    setAuthError("")
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) { setAuthError("Invalid email or password"); return }
      const data = await res.json()
      setToken(data.access_token)
    } catch {
      setAuthError("Could not reach server")
    }
  }

  const handleSignUp = async (name: string, email: string, password: string) => {
    setAuthError("")
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) { setAuthError("Email already registered"); return }
      const data = await res.json()
      setToken(data.access_token)
    } catch {
      setAuthError("Could not reach server")
    }
  }

  if (!token) {
    if (authPage === "signup") {
      return (
        <SignUpPage
          onSignUp={handleSignUp}
          onLogin={() => { setAuthError(""); setAuthPage("login") }}
          error={authError}
        />
      )
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSignUp={() => { setAuthError(""); setAuthPage("signup") }}
        error={authError}
      />
    )
  }

  const renderPage = () => {
    switch (active) {
      case "dashboard": return <DashboardPage />
      case "history": return <HistoryPage />
      case "analytics": return <AnalyticsPage />
      case "cctv": return <CCTVPage />
      case "settings": return <SettingsPage />
      default: return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar
        active={active}
        onNavigate={setActive}
        onLogout={() => {
          setToken(null)
          setAuthPage("login")
        }}
      />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  )
}

export default App
