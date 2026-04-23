"use client"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { SettingsLayout } from "@/layouts/settings-layout"
import { ProfileHeader } from "@/components/profile-header"
import { PersonalInfoForm } from "@/components/personal-info-form"
import { ManageAccountCard } from "@/components/manage-account-card"

import { mockUser } from "@/configs/user.config"
import { accountActions } from "@/configs/account-actions"

export function SettingsPage() {
    return (
        <PageContent>
            <PageHeader
                title="Settings"
                description="Manage your account"
            />
            <SettingsLayout
                one={<ProfileHeader {...mockUser} />}
                two={
                    <ManageAccountCard userEmail={mockUser.email}
                        {...accountActions}
                    />
                }
                three={
                    <PersonalInfoForm
                        userInfo={mockUser}
                        onUpdate={(data) =>
                            console.log("UPDATE:", data)
                        }
                    />
                }
            />
        </PageContent>
    )
}