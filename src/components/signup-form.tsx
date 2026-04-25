import { useState } from "react"
import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Props = {
    onSubmit: (name: string, email: string, password: string) => void
    onLogin?: () => void
    error?: string
    loading?: boolean
    className?: string
}

export function SignUpForm({ onSubmit, onLogin, error, loading, className }: Props) {
    const [passwordError, setPasswordError] = useState("")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const name = (form.elements.namedItem("name") as HTMLInputElement).value
        const email = (form.elements.namedItem("email") as HTMLInputElement).value
        const password = (form.elements.namedItem("password") as HTMLInputElement).value
        const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value

        if (password !== confirmPassword) {
            setPasswordError("Passwords do not match")
            return
        }
        setPasswordError("")
        onSubmit(name, email, password)
    }

    return (
        <AuthCard className={className}>
            <div className="flex justify-center">
                <img
                    src="https://i.imgur.com/xDSUCZY_d.webp?maxwidth=760&fidelity=grand"
                    alt="TechSentinel Logo"
                    className="h-14 w-auto object-contain"
                />
            </div>

            <div className="text-center flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Create account</h1>
                <p className="text-sm text-muted-foreground">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel>Full name</FieldLabel>
                        <Input name="name" type="text" placeholder="Juan dela Cruz" required disabled={loading} />
                    </Field>

                    <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input name="email" type="email" placeholder="you@example.com" required disabled={loading} />
                    </Field>

                    <Field>
                        <FieldLabel>Password</FieldLabel>
                        <Input name="password" type="password" required disabled={loading} />
                    </Field>

                    <Field>
                        <FieldLabel>Confirm password</FieldLabel>
                        <Input name="confirmPassword" type="password" required disabled={loading} />
                    </Field>

                    <Field>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating account…" : "Create account"}
                        </Button>
                    </Field>
                </FieldGroup>
            </form>

            {passwordError && <p className="text-sm text-destructive text-center">{passwordError}</p>}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            {onLogin && (
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={onLogin}
                        disabled={loading}
                        className="text-primary font-medium underline-offset-4 hover:underline cursor-pointer"
                    >
                        Log in
                    </button>
                </p>
            )}
        </AuthCard>
    )
}
