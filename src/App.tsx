import { useState } from "react"

import LoginPage from "@/pages/login"
import { DashboardPage } from "@/pages/dashboard"
import { HistoryPage } from "@/pages/history"
import { AnalyticsPage } from "@/pages/analytics"
import { CCTVPage } from "@/pages/cctv"
import { SettingsPage } from "@/pages/settings"

import { AppSidebar } from "@/components/app-sidebar"

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [active, setActive] = useState("dashboard")

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />
  }

  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <DashboardPage />
      case "history":
        return <HistoryPage />
      case "analytics":
        return <AnalyticsPage />
      case "cctv":
        return <CCTVPage />
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">

      <AppSidebar
        active={active}
        onNavigate={setActive}
        onLogout={() => setLoggedIn(false)}
      />

      {/* CRITICAL: NO padding here */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {renderPage()}
      </div>

    </div>
  )
}

export default App