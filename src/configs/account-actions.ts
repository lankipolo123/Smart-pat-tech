export const accountActions = {
    onChangeEmail: (data: { newEmail: string; password: string }) => {
        console.log("EMAIL UPDATE:", data)
    },

    onChangePassword: (data: {
        currentPassword: string
        newPassword: string
    }) => {
        console.log("PASSWORD UPDATE:", data)
    },

    onDeactivate: () => {
        console.log("DEACTIVATE ACCOUNT")
    },

    onDelete: () => {
        console.log("DELETE ACCOUNT")
    },
}