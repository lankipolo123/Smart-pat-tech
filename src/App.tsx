import { useState } from "react"

import LoginPage from "@/pages/login"
import SignUpPage from "@/pages/signup"
import { DashboardPage } from "@/pages/dashboard"
import { HistoryPage } from "@/pages/history"
import { AnalyticsPage } from "@/pages/analytics"
import { CCTVPage } from "@/pages/cctv"
import { SettingsPage } from "@/pages/settings"

import { AppSidebar } from "@/components/app-sidebar"
import { loginUser, registerUser, saveSession, loadSession, clearSession } from "@/services/auth"
import { AuthProvider } from "@/contexts/auth-context"

type SessionUser = { token: string; name: string; email: string }

function App() {
  const [session, setSession] = useState<SessionUser | null>(() => loadSession())
  const [authPage, setAuthPage] = useState<"login" | "signup">("login")
  const [active, setActive] = useState("dashboard")
  const [authError, setAuthError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (email: string, password: string) => {
    setAuthError("")
    setLoading(true)
    try {
      const data = await loginUser(email, password)
      saveSession(data.access_token, data.name, data.email)
      setSession({ token: data.access_token, name: data.name, email: data.email })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not reach server")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (name: string, email: string, password: string) => {
    setAuthError("")
    setLoading(true)
    try {
      const data = await registerUser(name, email, password)
      saveSession(data.access_token, data.name, data.email)
      setSession({ token: data.access_token, name: data.name, email: data.email })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not reach server")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    setAuthPage("login")
  }

  if (!session) {
    if (authPage === "signup") {
      return (
        <SignUpPage
          onSignUp={handleSignUp}
          onLogin={() => { setAuthError(""); setAuthPage("login") }}
          error={authError}
          loading={loading}
        />
      )
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSignUp={() => { setAuthError(""); setAuthPage("signup") }}
        error={authError}
        loading={loading}
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
    <AuthProvider user={session}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar
          active={active}
          onNavigate={setActive}
          onLogout={handleLogout}
        />
        <div className="flex-1 min-w-0 overflow-y-auto">
          {renderPage()}
        </div>
      </div>
    </AuthProvider>
  )
}

export default App
