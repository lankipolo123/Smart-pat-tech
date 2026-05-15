import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type UserInfo = {
    firstName?: string
    lastName?: string
    email?: string
    contact?: string
    address?: string
}

type Props = {
    userInfo: UserInfo
    onUpdate: (data: { firstName: string; lastName: string; email: string }) => Promise<void>
}

export function PersonalInfoForm({ userInfo, onUpdate }: Props) {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        contact: "",
        address: "",
    })
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

    useEffect(() => {
        setForm({
            firstName: userInfo.firstName || "",
            lastName: userInfo.lastName || "",
            email: userInfo.email || "",
            contact: userInfo.contact || "",
            address: userInfo.address || "",
        })
    }, [userInfo])

    const handleSave = async () => {
        setSaving(true)
        setStatus("idle")
        try {
            await onUpdate({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
            })
            setStatus("success")
        } catch {
            setStatus("error")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-primary">Personal Information</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        placeholder="First Name"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                    <Input
                        placeholder="Last Name"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Input
                        placeholder="Email"
                        value={form.email} disabled
                        className="opacity-50 cursor-not-allowed"
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <Input
                        placeholder="Contact"
                        value={form.contact}
                        onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    />
                </div>

                <textarea
                    placeholder="Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm resize-none min-h-[80px]"
                />

                <div className="flex items-center justify-end gap-3">
                    {status === "success" && (
                        <span className="text-xs text-green-600">Changes saved.</span>
                    )}
                    {status === "error" && (
                        <span className="text-xs text-red-500">Failed to save. Try again.</span>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="self-end">
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}