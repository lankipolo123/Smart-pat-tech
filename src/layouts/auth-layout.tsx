import * as React from "react"

type Props = {
    children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* LEFT SIDE */}
            <div className="flex flex-col p-6 md:p-10">
                {/* LOGO */}
                <div className="flex justify-center md:justify-start">
                    <a
                        href="#"
                        className="flex items-center gap-4 font-medium"
                    >
                        {/* BIG LOGO */}
                        <img
                            src="https://i.imgur.com/xDSUCZY.png"
                            alt="Logo"
                            className="h-16 w-16 object-contain"
                        />

                        {/* BRAND TEXT */}
                        <span className="text-xl font-semibold">
                            Acme Inc.
                        </span>
                    </a>
                </div>

                {/* FORM AREA */}
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        {children}
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="relative hidden lg:block overflow-hidden">
                <img
                    src="https://i.imgur.com/k0G0eJ2.png"
                    alt="Auth visual"
                    className="absolute inset-0 h-full w-full object-cover"
                />

                {/* subtle dark overlay */}
                <div className="absolute inset-0 bg-black/20" />

                {/* text overlay */}
                <div className="absolute bottom-10 left-10 text-white">
                    <h2 className="text-xl font-semibold">
                        Welcome back
                    </h2>
                    <p className="text-sm text-white/80">
                        Sign in to continue
                    </p>
                </div>
            </div>
        </div>
    )
}