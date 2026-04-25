import AuthLayout from "@/layouts/auth-layout"
import { LoginForm } from "@/components/login-form"

type Props = {
    onLogin: (email: string, password: string) => void
    onSignUp: () => void
    loading?: boolean
}

export default function LoginPage({ onLogin, onSignUp, loading }: Props) {
    return (
        <AuthLayout variant="login">
            <LoginForm onSubmit={onLogin} onSignUp={onSignUp} loading={loading} />
        </AuthLayout>
    )
}
