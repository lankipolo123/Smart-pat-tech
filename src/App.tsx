import { useState } from "react"

import LoginPage from "@/pages/login"
import SignUpPage from "@/pages/signup"
import { DashboardPage } from "@/pages/dashboard"
import { HistoryPage } from "@/pages/history"
import { AnalyticsPage } from "@/pages/analytics"
import { CCTVPage } from "@/pages/cctv"
import { SettingsPage } from "@/pages/settings"

import { AppSidebar } from "@/components/app-sidebar"

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [authPage, setAuthPage] = useState<"login" | "signup">("login")
  const [active, setActive] = useState("dashboard")

  if (!loggedIn) {
    if (authPage === "signup") {
      return (
        <SignUpPage
          onSignUp={() => setLoggedIn(true)}
          onLogin={() => setAuthPage("login")}
        />
      )
    }
    return (
      <LoginPage
        onLogin={() => setLoggedIn(true)}
        onSignUp={() => setAuthPage("signup")}
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
          setLoggedIn(false)
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
