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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type SessionUser = { token: string; name: string; email: string; joinedAt: string | null; lastLogin: string | null }
type AuthDialog = "created" | "exists" | "login-invalid" | "login-server" | null

function App() {
  const [session, setSession] = useState<SessionUser | null>(() => loadSession())
  const [authPage, setAuthPage] = useState<"login" | "signup">("login")
  const [active, setActive] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<AuthDialog>(null)
  const [pendingSession, setPendingSession] = useState<SessionUser | null>(null)

  const handleLogin = async (email: string, password: string) => {
    setLoading(true)
    try {
      const data = await loginUser(email, password)
      saveSession(data.access_token, data.name, data.email, data.joined_at, data.last_login)
      setSession({ token: data.access_token, name: data.name, email: data.email, joinedAt: data.joined_at, lastLogin: data.last_login })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      setDialog(msg === "Invalid email or password" ? "login-invalid" : "login-server")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const data = await registerUser(name, email, password)
      saveSession(data.access_token, data.name, data.email, data.joined_at, data.last_login)
      setPendingSession({ token: data.access_token, name: data.name, email: data.email, joinedAt: data.joined_at, lastLogin: data.last_login })
      setDialog("created")
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      setDialog(msg === "Email already registered" ? "exists" : "login-server")
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
    return (
      <>
        {authPage === "signup" ? (
          <SignUpPage
            onSignUp={handleSignUp}
            onLogin={() => { setDialog(null); setAuthPage("login") }}
            loading={loading}
          />
        ) : (
          <LoginPage
            onLogin={handleLogin}
            onSignUp={() => { setDialog(null); setAuthPage("signup") }}
            loading={loading}
          />
        )}

        {/* Account created */}
        <Dialog open={dialog === "created"} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Account created!</DialogTitle>
              <DialogDescription>
                Welcome, {pendingSession?.name}. Your account has been set up successfully.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => { setDialog(null); if (pendingSession) setSession(pendingSession) }}>
                Get started
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email already exists */}
        <Dialog open={dialog === "exists"} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Account already exists</DialogTitle>
              <DialogDescription>
                An account with that email is already registered. Would you like to log in instead?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button onClick={() => { setDialog(null); setAuthPage("login") }}>Go to login</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invalid credentials */}
        <Dialog open={dialog === "login-invalid"} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Invalid credentials</DialogTitle>
              <DialogDescription>
                The email or password you entered is incorrect. Please try again or create a new account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialog(null); setAuthPage("signup") }}>
                Create account
              </Button>
              <Button onClick={() => setDialog(null)}>Try again</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Server unreachable */}
        <Dialog open={dialog === "login-server"} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Could not connect</DialogTitle>
              <DialogDescription>
                Unable to reach the server. Make sure the backend is running and try again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDialog(null)}>Try again</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
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
