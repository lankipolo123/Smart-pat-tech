import AuthLayout from "@/layouts/auth-layout"
import { SignUpForm } from "@/components/signup-form"

type Props = {
    onSignUp: () => void
    onLogin: () => void
}

export default function SignUpPage({ onSignUp, onLogin }: Props) {
    const handleSignUp = (name: string, email: string, password: string) => {
        if (name && email && password) onSignUp()
    }

    return (
        <AuthLayout variant="signup">
            <SignUpForm onSubmit={handleSignUp} onLogin={onLogin} />
        </AuthLayout>
    )
}
