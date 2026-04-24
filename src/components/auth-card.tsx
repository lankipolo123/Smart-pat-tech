import { cn } from "@/lib/utils"

type Props = {
    children: React.ReactNode
    className?: string
}

export function AuthCard({ children, className }: Props) {
    return (
        <div className={cn(
            "flex flex-col gap-6 w-full rounded-2xl border-2 border-primary bg-background p-10 shadow-md",
            className
        )}>
            {children}
        </div>
    )
}
