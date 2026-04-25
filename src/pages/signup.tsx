import AuthLayout from "@/layouts/auth-layout"
import { SignUpForm } from "@/components/signup-form"

type Props = {
    onSignUp: (name: string, email: string, password: string) => void
    onLogin: () => void
    error?: string
}

export default function SignUpPage({ onSignUp, onLogin, error }: Props) {
    return (
        <AuthLayout variant="signup">
            <SignUpForm onSubmit={onSignUp} onLogin={onLogin} error={error} />
        </AuthLayout>
    )
}
