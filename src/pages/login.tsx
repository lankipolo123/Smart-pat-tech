import AuthLayout from "@/layouts/auth-layout"
import { LoginForm } from "@/components/login-form"

type Props = {
    onLogin: () => void
}

export default function LoginPage({ onLogin }: Props) {
    const handleLogin = (email: string, password: string) => {
        if (email && password) onLogin()
    }

    return (
        <AuthLayout>
            <LoginForm onSubmit={handleLogin} />
        </AuthLayout>
    )
}