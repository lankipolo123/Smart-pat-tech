import AuthLayout from "@/layouts/auth-layout"
import { LoginForm } from "@/components/login-form"

type Props = {
    onLogin: (email: string, password: string) => void
    onSignUp: () => void
    error?: string
}

export default function LoginPage({ onLogin, onSignUp, error }: Props) {
    return (
        <AuthLayout variant="login">
            <LoginForm onSubmit={onLogin} onSignUp={onSignUp} error={error} />
        </AuthLayout>
    )
}
