"use client"

import * as React from "react"

type Props = {
    children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2 relative">

            {/* LEFT SIDE */}
            <div className="flex flex-col p-6 md:p-10 relative overflow-hidden">

                {/* 🔴 RED GRID ONLY (NO TINT LAYER) */}
                <div
                    className="absolute inset-0 opacity-25"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(255,0,0,0.25) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,0,0,0.25) 1px, transparent 1px)
                        `,
                        backgroundSize: "70px 70px",
                        maskImage:
                            "radial-gradient(circle at 30% 40%, black 30%, transparent 75%)",
                        WebkitMaskImage:
                            "radial-gradient(circle at 30% 40%, black 30%, transparent 75%)",
                    }}
                />

                {/* FLOATING LOGO */}
                <div className="absolute -top-[44px] -left-6 md:-top-[70px] md:-left-16 z-10">
                    <img
                        src="https://i.imgur.com/k0G0eJ2.png"
                        alt="Logo"
                        className="h-80 w-80 object-contain"
                    />
                </div>

                {/* FORM AREA */}
                <div className="relative z-10 flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        {children}
                    </div>
                </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="relative hidden lg:block overflow-hidden">

                {/* BASE IMAGE */}
                <img
                    src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a"
                    alt="Structured Parking View"
                    className="absolute inset-0 h-full w-full object-cover"
                />

                {/* STRONG RED CCTV TINT */}
                <div className="absolute inset-0 bg-red-600/25" />

                {/* CLEAN WHITE GRID */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />

            </div>

        </div>
    )
}