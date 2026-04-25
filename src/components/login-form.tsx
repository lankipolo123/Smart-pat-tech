import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Props = {
    onSubmit: (email: string, password: string) => void
    onSignUp?: () => void
    error?: string
    loading?: boolean
    className?: string
}

export function LoginForm({ onSubmit, onSignUp, error, loading, className }: Props) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const email = (form.elements.namedItem("email") as HTMLInputElement).value
        const password = (form.elements.namedItem("password") as HTMLInputElement).value
        onSubmit(email, password)
    }

    return (
        <AuthCard className={className}>
            <div className="text-center flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Login</h1>
                <p className="text-sm text-muted-foreground">Enter your credentials</p>
            </div>

            <form onSubmit={handleSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input name="email" type="email" required disabled={loading} />
                    </Field>

                    <Field>
                        <FieldLabel>Password</FieldLabel>
                        <Input name="password" type="password" required disabled={loading} />
                    </Field>

                    <Field>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Logging in…" : "Login"}
                        </Button>
                    </Field>
                </FieldGroup>
            </form>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            {onSignUp && (
                <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                        type="button"
                        onClick={onSignUp}
                        disabled={loading}
                        className="text-primary font-medium underline-offset-4 hover:underline cursor-pointer"
                    >
                        Sign up
                    </button>
                </p>
            )}
        </AuthCard>
    )
}
