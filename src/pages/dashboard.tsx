import DashboardLayout from "@/layouts/dashboard-layout"

type Props = {
    active: string
    onNavigate: (url: string) => void
    onLogout: () => void
}

export default function DashboardPage({
    active,
    onNavigate,
    onLogout,
}: Props) {
    return (
        <DashboardLayout
            active={active}
            onNavigate={onNavigate}
            onLogout={onLogout}
        >
            <div className="text-lg font-medium">
                {active} page content
            </div>
        </DashboardLayout>
    )
}