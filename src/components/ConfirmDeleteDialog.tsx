import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

type Props = {
    open: boolean
    type?: string | null
    name?: string
    onCancel: () => void
    onConfirm: () => void
}

export function ConfirmDeleteDialog({
    open,
    type,
    name,
    onCancel,
    onConfirm,
}: Props) {
    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) onCancel()
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Delete {type}?
                    </DialogTitle>

                    <DialogDescription>
                        This will permanently delete{" "}
                        <span className="font-semibold text-foreground">
                            {name}
                        </span>
                        .
                        <br />
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}