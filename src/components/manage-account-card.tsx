import { useState } from "react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardAction,
    CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LockIcon } from "lucide-react"

type Props = {
    userEmail: string
    onChangeEmail: (data: { newEmail: string; password: string }) => void
    onChangePassword: (data: {
        currentPassword: string
        newPassword: string
    }) => void
    onDeactivate: () => void
    onDelete: () => void
}

export function ManageAccountCard({
    userEmail,
    onChangeEmail,
    onChangePassword,
    onDeactivate,
    onDelete,
}: Props) {
    const [newEmail, setNewEmail] = useState("")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Manage Your Account</CardTitle>
                <CardAction>
                    <LockIcon className="size-4 text-muted-foreground" />
                </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-6 pt-4">
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Change Email</p>
                    <p className="text-xs text-muted-foreground">
                        Current: {userEmail}
                    </p>

                    <Input
                        placeholder="New email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                    />

                    <Input
                        type="password"
                        placeholder="Confirm password"
                        value={currentPassword}
                        onChange={(e) =>
                            setCurrentPassword(e.target.value)
                        }
                    />

                    <Button
                        onClick={() =>
                            onChangeEmail({
                                newEmail,
                                password: currentPassword,
                            })
                        }
                    >
                        Update Email
                    </Button>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Change Password</p>

                    <Input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) =>
                            setCurrentPassword(e.target.value)
                        }
                    />

                    <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) =>
                            setNewPassword(e.target.value)
                        }
                    />

                    <Button
                        onClick={() =>
                            onChangePassword({
                                currentPassword,
                                newPassword,
                            })
                        }
                    >
                        Change Password
                    </Button>
                </div>

                <div className="flex flex-col gap-2 border-t pt-4">
                    <p className="text-sm text-center font-semibold">
                        Account Termination
                    </p>

                    <div className="flex justify-center gap-4">
                        <Button
                            variant="link"
                            className="text-destructive"
                            onClick={onDeactivate}
                        >
                            Deactivate
                        </Button>

                        <Button
                            variant="link"
                            className="text-destructive"
                            onClick={onDelete}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}