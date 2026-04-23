import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
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
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-6 w-full max-w-md rounded-2xl border-2 border-primary bg-background p-10 shadow-md",
        className
      )}
    >
      <FieldGroup>
        {/* HEADER */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials
          </p>
        </div>

        {/* EMAIL */}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input name="email" type="email" required />
        </Field>

        {/* PASSWORD */}
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input name="password" type="password" required />
        </Field>

        {/* BUTTON */}
        <Field>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </Field>


        {/* GITHUB LOGIN */}
      </FieldGroup>
    </form>
  )
}