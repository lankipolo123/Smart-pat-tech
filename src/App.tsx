import { useState } from "react"

import LoginPage from "@/pages/login"
import SignUpPage from "@/pages/signup"
import { DashboardPage } from "@/pages/dashboard"
import { HistoryPage } from "@/pages/history"
import { AnalyticsPage } from "@/pages/analytics"
import { SettingsPage } from "@/pages/settings"
import ConfigurePage from "@/pages/configure"

import { AppSidebar } from "@/components/app-sidebar"
import DashboardLayout from "@/layouts/dashboard-layout"
import {
  loginUser, registerUser, saveSession, loadSession,
  clearSession, updateProfile, uploadAvatar,
  changeEmail, changePassword, deactivateAccount, deleteAccount,
} from "@/services/auth"
import { AuthProvider } from "@/contexts/auth-context"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type SessionUser = {
  token: string
  name: string
  email: string
  joinedAt: string | null
  lastLogin: string | null
  photoURL?: string
}
type AuthDialog = "created" | "exists" | "login-invalid" | "login-server" | null
type AccountDialog = "email-success" | "password-success" | "deactivate-confirm" | "delete-confirm" | "account-error" | null

function App() {
  const [session, setSession] = useState<SessionUser | null>(() => loadSession())
  const [authPage, setAuthPage] = useState<"login" | "signup">("login")
  const [active, setActive] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<AuthDialog>(null)
  const [accountDialog, setAccountDialog] = useState<AccountDialog>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
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

  const handleUpdateProfile = async (data: { firstName: string; lastName: string; email: string }) => {
    if (!session) return
    await updateProfile(session.token, data)
    const newName = [data.firstName, data.lastName].filter(Boolean).join(" ")
    saveSession(session.token, newName, data.email, session.joinedAt, session.lastLogin)
    setSession((prev) => prev ? { ...prev, name: newName, email: data.email } : prev)
  }

  const handlePhotoUpdate = (photoURL: string) => {
    localStorage.setItem("userPhotoURL", photoURL)
    setSession((prev) => prev ? { ...prev, photoURL } : prev)
  }

  const handleUploadAvatar = async (file: File) => {
    if (!session) return
    const result = await uploadAvatar(session.token, file)
    handlePhotoUpdate(result.photoURL)
  }

  const handleChangeEmail = async (data: { newEmail: string; password: string }) => {
    if (!session) return
    try {
      const result = await changeEmail(session.token, data.newEmail, data.password)
      saveSession(session.token, session.name, result.email, session.joinedAt, session.lastLogin)
      setSession((prev) => prev ? { ...prev, email: result.email } : prev)
      setAccountDialog("email-success")
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to update email")
      setAccountDialog("account-error")
    }
  }

  const handleChangePassword = async (data: { currentPassword: string; newPassword: string }) => {
    if (!session) return
    try {
      await changePassword(session.token, data.currentPassword, data.newPassword)
      setAccountDialog("password-success")
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to change password")
      setAccountDialog("account-error")
    }
  }

  const handleDeactivate = async () => {
    setAccountDialog("deactivate-confirm")
  }

  const handleDeactivateConfirm = async () => {
    if (!session) return
    try {
      await deactivateAccount(session.token)
      clearSession()
      setSession(null)
      setAccountDialog(null)
      setAuthPage("login")
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to deactivate account")
      setAccountDialog("account-error")
    }
  }

  const handleDelete = async () => {
    setAccountDialog("delete-confirm")
  }

  const handleDeleteConfirm = async () => {
    if (!session) return
    try {
      await deleteAccount(session.token)
      clearSession()
      setSession(null)
      setAccountDialog(null)
      setAuthPage("login")
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to delete account")
      setAccountDialog("account-error")
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

        <Dialog open={dialog === "created"} onOpenChange={() => { }}>
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

        <Dialog open={dialog === "exists"} onOpenChange={() => { }}>
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

        <Dialog open={dialog === "login-invalid"} onOpenChange={() => { }}>
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

        <Dialog open={dialog === "login-server"} onOpenChange={() => { }}>
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
      case "configure": return <ConfigurePage />
      case "analytics": return <AnalyticsPage />
      case "settings": return (
        <SettingsPage
          onUploadAvatar={handleUploadAvatar}
          onChangeEmail={handleChangeEmail}
          onChangePassword={handleChangePassword}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      )
      default: return <DashboardPage />
    }
  }

  return (
    <AuthProvider
      key={`${session?.name}-${session?.email}-${session?.photoURL}`}
      user={session}
      onUpdate={handleUpdateProfile}
      onPhotoUpdate={handlePhotoUpdate}
    >
      <DashboardLayout
        sidebar={(collapsed) => (
          <AppSidebar
            active={active}
            onNavigate={setActive}
            onLogout={handleLogout}
            collapsed={collapsed}
          />
        )}
      >
        {renderPage()}
      </DashboardLayout>

      {/* ACCOUNT DIALOGS */}
      <Dialog open={accountDialog === "email-success"} onOpenChange={() => setAccountDialog(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Email updated</DialogTitle>
            <DialogDescription>Your email address has been changed successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAccountDialog(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialog === "password-success"} onOpenChange={() => setAccountDialog(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Password changed</DialogTitle>
            <DialogDescription>Your password has been updated successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAccountDialog(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialog === "deactivate-confirm"} onOpenChange={() => setAccountDialog(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deactivate account?</DialogTitle>
            <DialogDescription>Your account will be deactivated. You won't be able to log in until it's reactivated.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivateConfirm}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialog === "delete-confirm"} onOpenChange={() => setAccountDialog(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>This is permanent. All your data will be deleted and cannot be recovered.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialog === "account-error"} onOpenChange={() => setAccountDialog(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Something went wrong</DialogTitle>
            <DialogDescription>{accountError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAccountDialog(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthProvider>
  )
}

export default App