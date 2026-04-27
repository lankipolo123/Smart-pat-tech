import type { SessionRecord } from "@/services/parking"

type Props = { session: SessionRecord }

export function StatusBadge({ session }: Props) {
    if (session.exit === null)
        return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">Ongoing</span>
    return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Done</span>
}