"use client"

import { useEffect, useState } from "react"

import {
    Line,
    LineChart,
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ResponsiveContainer,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

import {
    fetchRevenueData,
    fetchVehicleData,
    type RevenuePoint,
    type VehiclePoint,
} from "@/services/analytics"

type Tab = "revenue" | "vehicles"

export function AnalyticsCharts() {
    const [activeTab, setActiveTab] =
        useState<Tab>("revenue")

    const [revenueData, setRevenueData] =
        useState<RevenuePoint[]>([])

    const [vehicleData, setVehicleData] =
        useState<VehiclePoint[]>([])

    useEffect(() => {
        Promise.all([
            fetchRevenueData(),
            fetchVehicleData(),
        ]).then(([revenue, vehicles]) => {
            setRevenueData(revenue)
            setVehicleData(vehicles)
        })
    }, [])

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Performance Overview
                </CardTitle>

                <CardDescription>
                    Revenue and vehicle trends over time
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Tabs
                    value={activeTab}
                    onValueChange={(v) =>
                        setActiveTab(v as Tab)
                    }
                >
                    <TabsList className="mb-4 w-fit">
                        <TabsTrigger value="revenue">
                            Revenue
                        </TabsTrigger>

                        <TabsTrigger value="vehicles">
                            Vehicles
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {activeTab === "revenue" && (
                    <ChartContainer
                        config={{
                            revenue: {
                                label: "Revenue (₱)",
                                color: "var(--chart-3)",
                            },
                        }}
                        className="h-[260px] w-full contain-layout"
                    >
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart data={revenueData}>
                                <CartesianGrid vertical={false} />

                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 11 }}
                                />

                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v: number) =>
                                        `₱${(v / 1000).toFixed(0)}k`
                                    }
                                />

                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="var(--chart-3)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )}

                {activeTab === "vehicles" && (
                    <ChartContainer
                        config={{
                            vehicles: {
                                label: "Vehicles",
                                color: "var(--chart-1)",
                            },
                        }}
                        className="h-[260px] w-full contain-layout"
                    >
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <BarChart data={vehicleData}>
                                <CartesianGrid vertical={false} />

                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 11 }}
                                />

                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 11 }}
                                />

                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                />

                                <Bar
                                    dataKey="vehicles"
                                    fill="var(--chart-1)"
                                    radius={[4, 4, 0, 0]}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}