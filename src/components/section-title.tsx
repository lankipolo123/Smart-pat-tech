type Props = {
    title: string
    description?: string
}

export function SectionTitle({ title, description }: Props) {
    return (
        <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
    )
}