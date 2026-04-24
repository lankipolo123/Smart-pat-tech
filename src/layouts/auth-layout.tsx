import * as React from "react"

type Props = {
    children: React.ReactNode
    variant?: "login" | "signup"
}

export default function AuthLayout({ children, variant = "login" }: Props) {
    const isSignup = variant === "signup"

    const formSide = (
        <div className="flex flex-col p-6 md:p-10 relative overflow-hidden">
            {/* RED GRID */}
            <div
                className="absolute inset-0 opacity-25"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(255,0,0,0.25) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,0,0,0.25) 1px, transparent 1px)
                    `,
                    backgroundSize: "70px 70px",
                    maskImage: "radial-gradient(circle at 30% 40%, black 30%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(circle at 30% 40%, black 30%, transparent 75%)",
                }}
            />

            {/* FLOATING LOGO */}
            <div className={`absolute z-10 ${isSignup
                ? "-top-[44px] -right-6 md:-top-[70px] md:-right-16"
                : "-top-[44px] -left-6 md:-top-[70px] md:-left-16"
            }`}>
                <img
                    src="https://i.imgur.com/k0G0eJ2.png"
                    alt="Logo"
                    className={`h-80 w-80 object-contain ${isSignup ? "scale-x-[-1]" : ""}`}
                />
            </div>

            {/* FORM AREA */}
            <div className="relative z-10 flex flex-1 items-center justify-center">
                <div className="w-full max-w-xs">
                    {children}
                </div>
            </div>
        </div>
    )

    const imageSide = (
        <div className="relative hidden lg:block overflow-hidden">
            <img
                src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a"
                alt="Structured Parking View"
                className="absolute inset-0 h-full w-full object-cover"
            />
            {/* RED TINT */}
            <div className="absolute inset-0 bg-red-600/25" />
            {/* WHITE GRID */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className={`absolute bottom-10 text-white ${isSignup ? "left-10" : "left-10"}`}>
                <h2 className="text-xl font-semibold">
                    {isSignup ? "Join us today" : "Welcome back"}
                </h2>
                <p className="text-sm text-white/80">
                    {isSignup ? "Create an account to get started" : "Sign in to continue"}
                </p>
            </div>
        </div>
    )

    return (
        <div className="grid min-h-svh lg:grid-cols-2 relative">
            {isSignup ? imageSide : formSide}
            {isSignup ? formSide : imageSide}
        </div>
    )
}
