import { useState } from "react"

import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"

function App() {
  const [page, setPage] = useState<"login" | "dashboard">("login")
  const [active, setActive] = useState("dashboard")

  const goLogin = () => setPage("login")
  const goDashboard = () => setPage("dashboard")

  if (page === "login") {
    return <LoginPage onLogin={goDashboard} />
  }

  return (
    <DashboardPage
      active={active}
      onNavigate={setActive}
      onLogout={goLogin}
    />
  )
}

export default App