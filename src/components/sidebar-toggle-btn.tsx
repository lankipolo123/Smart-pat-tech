import { ChevronRight } from "lucide-react"

type Props = {
    collapsed: boolean
    onClick: () => void
}

export function SidebarToggle({ collapsed, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className="group flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary bg-background shadow-sm hover:bg-primary hover:border-primary transition-colors"
        >
            <ChevronRight
                strokeWidth={2.5}
                className={`size-5 text-primary group-hover:text-white transition-all duration-200 ${collapsed ? "rotate-0" : "rotate-180"
                    }`}
            />
        </button>
    )
}