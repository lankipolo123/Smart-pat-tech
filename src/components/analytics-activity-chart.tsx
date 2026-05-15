"use client"

import {
    Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer,
} from "recharts"

import {
    Card, CardContent, CardDescription,
    CardHeader, CardTitle,
} from "@/components/ui/card"

import {
    ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart"

import { type ActivityPoint } from "@/services/analytics"

type Props = {
    data: ActivityPoint[]
    loading: boolean
}

export function AnalyticsActivityChart({ data, loading }: Props) {
    return (
        <Card className={`transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
            <CardHeader>
                <CardTitle>Vehicle Activity</CardTitle>
                <CardDescription>Vehicles per day this week</CardDescription>
            </CardHeader>

            <CardContent>
                <ChartContainer
                    config={{
                        vehicles: {
                            label: "Vehicles",
                            color: "var(--chart-1)",
                        },
                    }}
                    className="w-full h-[250px]"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="label"
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
                                allowDecimals={false}
                                domain={[0, "auto"]}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                                dataKey="vehicles"
                                fill="var(--chart-1)"
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}