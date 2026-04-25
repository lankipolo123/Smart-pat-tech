"use client"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { SettingsLayout } from "@/layouts/settings-layout"
import { ProfileHeader } from "@/components/profile-header"
import { PersonalInfoForm } from "@/components/personal-info-form"
import { ManageAccountCard } from "@/components/manage-account-card"

import { useAuth } from "@/contexts/auth-context"
import { accountActions } from "@/configs/account-actions"

export function SettingsPage() {
    const { name, email } = useAuth()

    const [firstName, ...rest] = name.split(" ")
    const lastName = rest.join(" ")

    return (
        <PageContent>
            <PageHeader
                title="Settings"
                description="Manage your account"
            />
            <SettingsLayout
                one={
                    <ProfileHeader
                        displayName={name}
                        role="User"
                        email={email}
                        status="active"
                    />
                }
                two={
                    <ManageAccountCard
                        userEmail={email}
                        {...accountActions}
                    />
                }
                three={
                    <PersonalInfoForm
                        userInfo={{ firstName, lastName, email }}
                        onUpdate={(data) => console.log("UPDATE:", data)}
                    />
                }
            />
        </PageContent>
    )
}
