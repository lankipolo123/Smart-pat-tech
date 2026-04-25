import AuthLayout from "@/layouts/auth-layout"
import { LoginForm } from "@/components/login-form"

type Props = {
    onLogin: (email: string, password: string) => void
    onSignUp: () => void
    error?: string
    loading?: boolean
}

export default function LoginPage({ onLogin, onSignUp, error, loading }: Props) {
    return (
        <AuthLayout variant="login">
            <LoginForm onSubmit={onLogin} onSignUp={onSignUp} error={error} loading={loading} />
        </AuthLayout>
    )
}
