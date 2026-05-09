"use client"

import { useState, useRef } from "react"
import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { SettingsLayout } from "@/layouts/settings-layout"
import { ProfileHeader } from "@/components/profile-header"
import { PersonalInfoForm } from "@/components/personal-info-form"
import { ManageAccountCard } from "@/components/manage-account-card"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { useAuth } from "@/contexts/auth-context"

function formatDate(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    })
}

type Props = {
    onUploadAvatar: (file: File) => Promise<void>
    onChangeEmail: (data: { newEmail: string; password: string }) => Promise<void>
    onChangePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>
    onDeactivate: () => void
    onDelete: () => void
}

export function SettingsPage({
    onUploadAvatar,
    onChangeEmail,
    onChangePassword,
    onDeactivate,
    onDelete,
}: Props) {
    const { name, email, joinedAt, lastLogin, photoURL, updateUser } = useAuth()

    const [firstName, ...rest] = name.split(" ")
    const lastName = rest.join(" ")

    const [photoDialog, setPhotoDialog] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            setUploadError("Please select a valid image file.")
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setUploadError("Image must be less than 5MB.")
            return
        }

        setUploadError(null)
        setSelectedFile(file)
        setPreview(URL.createObjectURL(file))
    }

    const handleUploadConfirm = async () => {
        if (!selectedFile) {
            setUploadError("Please select a photo first.")
            return
        }
        setUploading(true)
        setUploadError(null)
        try {
            await onUploadAvatar(selectedFile)
            setPhotoDialog(false)
            setPreview(null)
            setSelectedFile(null)
        } catch {
            setUploadError("Failed to upload photo. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    const handleDialogClose = () => {
        if (uploading) return
        setPhotoDialog(false)
        setPreview(null)
        setSelectedFile(null)
        setUploadError(null)
    }

    return (
        <>
            <PageHeader title="Settings" description="Manage your account" />
            <PageContent>
                <SettingsLayout
                    one={
                        <ProfileHeader
                            displayName={name}
                            role="User"
                            email={email}
                            status="active"
                            photoURL={photoURL}
                            joinedDate={formatDate(joinedAt)}
                            lastLogin={formatDate(lastLogin)}
                            onChangePhoto={() => setPhotoDialog(true)}
                        />
                    }
                    two={
                        <ManageAccountCard
                            userEmail={email}
                            onChangeEmail={onChangeEmail}
                            onChangePassword={onChangePassword}
                            onDeactivate={onDeactivate}
                            onDelete={onDelete}
                        />
                    }
                    three={
                        <PersonalInfoForm
                            userInfo={{ firstName, lastName, email }}
                            onUpdate={updateUser}
                        />
                    }
                />
            </PageContent>

            <Dialog open={photoDialog} onOpenChange={handleDialogClose}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Change Profile Photo</DialogTitle>
                        <DialogDescription>
                            Select an image file. Max 5MB.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-2">
                        {preview ? (
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-24 h-24 rounded-full object-cover border"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                                No photo
                            </div>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            Choose File
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {uploadError && (
                            <p className="text-xs text-red-500">{uploadError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleDialogClose} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleUploadConfirm} disabled={uploading || !selectedFile}>
                            {uploading ? "Uploading..." : "Save Photo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}