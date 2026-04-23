import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Props = {
  onSubmit: (email: string, password: string) => void
  className?: string
}

export function LoginForm({ className, onSubmit }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    onSubmit(email, password)
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials
          </p>
        </div>

        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input name="email" type="email" required />
        </Field>

        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input name="password" type="password" required />
        </Field>

        <Field>
          <Button type="submit">Login</Button>
        </Field>

        <FieldSeparator>Or</FieldSeparator>

        <Field>
          <Button type="button" variant="outline">
            Login with GitHub
          </Button>

          <FieldDescription className="text-center">
            No account? <a className="underline">Sign up</a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}