"use client"

import { memo, useMemo, useState } from "react"

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
    type RevenuePoint,
    type VehiclePoint,
} from "@/services/analytics"

type Tab = "revenue" | "vehicles"

type Props = {
    revenueData: RevenuePoint[]
    vehicleData: VehiclePoint[]
    loading: boolean
}

export const AnalyticsCharts = memo(function AnalyticsCharts({
    revenueData,
    vehicleData,
    loading,
}: Props) {

    const [activeTab, setActiveTab] =
        useState<Tab>("revenue")

    const maxRevenue = useMemo(() => {
        return Math.max(
            ...revenueData.map((r) => r.revenue),
            0
        )
    }, [revenueData])

    const yTickFormatter = (v: number) => {
        if (maxRevenue >= 1000) {
            return `₱${(v / 1000).toFixed(1)}k`
        }

        return `₱${v}`
    }

    return (
        <Card
            className={`transition-opacity duration-150 ${loading
                    ? "opacity-70"
                    : "opacity-100"
                }`}
        >
            <CardHeader>
                <CardTitle>
                    Performance Overview
                </CardTitle>

                <CardDescription>
                    Revenue and vehicle trends
                    over time
                </CardDescription>
            </CardHeader>

            <CardContent className="min-w-0">
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

                {/* KEEP BOTH MOUNTED */}
                {/* JUST HIDE THEM */}
                {/* prevents recharts remount storms */}

                <div
                    className={
                        activeTab === "revenue"
                            ? "block"
                            : "hidden"
                    }
                >
                    <ChartContainer
                        config={{
                            revenue: {
                                label:
                                    "Revenue (₱)",
                                color:
                                    "var(--chart-3)",
                            },
                        }}
                        className="h-[260px] w-full min-w-0"
                    >

                        {/* STABLE HEIGHT */}
                        <div className="h-[260px] w-full min-w-0">

                            <ResponsiveContainer
                                width="100%"
                                height={260}
                            >
                                <LineChart
                                    data={revenueData}
                                    margin={{
                                        top: 8,
                                        right: 16,
                                        left: 8,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{
                                            fontSize: 11,
                                        }}
                                    />

                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{
                                            fontSize: 11,
                                        }}
                                        tickFormatter={
                                            yTickFormatter
                                        }
                                        domain={[
                                            0,
                                            "auto",
                                        ]}
                                    />

                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent />
                                        }
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="var(--chart-3)"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{
                                            r: 4,
                                        }}
                                        isAnimationActive={
                                            false
                                        }
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartContainer>
                </div>

                <div
                    className={
                        activeTab === "vehicles"
                            ? "block"
                            : "hidden"
                    }
                >
                    <ChartContainer
                        config={{
                            vehicles: {
                                label:
                                    "Vehicles",
                                color:
                                    "var(--chart-1)",
                            },
                        }}
                        className="h-[260px] w-full min-w-0"
                    >

                        {/* STABLE HEIGHT */}
                        <div className="h-[260px] w-full min-w-0">

                            <ResponsiveContainer
                                width="100%"
                                height={260}
                            >
                                <BarChart
                                    data={vehicleData}
                                    margin={{
                                        top: 8,
                                        right: 16,
                                        left: 8,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{
                                            fontSize: 11,
                                        }}
                                    />

                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{
                                            fontSize: 11,
                                        }}
                                        allowDecimals={
                                            false
                                        }
                                        domain={[
                                            0,
                                            "auto",
                                        ]}
                                    />

                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent />
                                        }
                                    />

                                    <Bar
                                        dataKey="vehicles"
                                        fill="var(--chart-1)"
                                        radius={[
                                            4,
                                            4,
                                            0,
                                            0,
                                        ]}
                                        isAnimationActive={
                                            false
                                        }
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    )
})