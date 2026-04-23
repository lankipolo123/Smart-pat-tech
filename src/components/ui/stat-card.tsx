type Props = {
    label: string
    value: string | number
}

export function StatCard({ label, value }: Props) {
    return (
        <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
        </div>
    )
}