import { Card } from "@/components/ui/card"

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: number
    color: string
}

export function StatCard({ icon, label, value, color }: StatCardProps) {
    return (
        <Card className="p-3">
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
                    {icon}
                </div>
                <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold">{value}</div>
                </div>
            </div>
        </Card>
    )
}
