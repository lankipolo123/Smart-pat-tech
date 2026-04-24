import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Props = {
    onSubmit: (name: string, email: string, password: string) => void
    onLogin?: () => void
    className?: string
}

export function SignUpForm({ onSubmit, onLogin, className }: Props) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const name = (form.elements.namedItem("name") as HTMLInputElement).value
        const email = (form.elements.namedItem("email") as HTMLInputElement).value
        const password = (form.elements.namedItem("password") as HTMLInputElement).value
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
                        <Input name="name" type="text" placeholder="Juan dela Cruz" required />
                    </Field>

                    <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input name="email" type="email" placeholder="you@example.com" required />
                    </Field>

                    <Field>
                        <FieldLabel>Password</FieldLabel>
                        <Input name="password" type="password" required />
                    </Field>

                    <Field>
                        <FieldLabel>Confirm password</FieldLabel>
                        <Input name="confirmPassword" type="password" required />
                    </Field>

                    <Field>
                        <Button type="submit" className="w-full">Create account</Button>
                    </Field>
                </FieldGroup>
            </form>

            {onLogin && (
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={onLogin}
                        className="text-primary font-medium underline-offset-4 hover:underline cursor-pointer"
                    >
                        Log in
                    </button>
                </p>
            )}
        </AuthCard>
    )
}
