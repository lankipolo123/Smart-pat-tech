import AuthLayout from "@/layouts/auth-layout"
import { LoginForm } from "@/components/login-form"

type Props = {
    onLogin: () => void
    onSignUp: () => void
}

export default function LoginPage({ onLogin, onSignUp }: Props) {
    const handleLogin = (email: string, password: string) => {
        if (email && password) onLogin()
    }

    return (
        <AuthLayout variant="login">
            <LoginForm onSubmit={handleLogin} onSignUp={onSignUp} />
        </AuthLayout>
    )
}
