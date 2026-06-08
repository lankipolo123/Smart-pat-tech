import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type Props = {
    src: string | null
}

export function PhotoPreview({ src }: Props) {
    return (
        <Avatar className="w-24 h-24 mx-auto">
            <AvatarImage src={src ?? undefined} alt="Preview" />
            <AvatarFallback>No photo</AvatarFallback>
        </Avatar>
    )
}