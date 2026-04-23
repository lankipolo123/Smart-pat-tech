"use client"

import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { revenueData, vehicleData } from "@/mocks/analytics.data"

export function AnalyticsCharts() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Revenue and vehicle trends over time</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="revenue">
                    <TabsList className="mb-4 w-fit">
                        <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    </TabsList>

                    <TabsContent value="revenue">
                        <ChartContainer
                            config={{ revenue: { label: "Revenue (₱)", color: "var(--chart-2)" } }}
                            className="h-[260px] w-full"
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
                                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line
                                    dataKey="revenue"
                                    stroke="var(--chart-2)"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ChartContainer>
                    </TabsContent>

                    <TabsContent value="vehicles">
                        <ChartContainer
                            config={{ vehicles: { label: "Vehicles", color: "var(--chart-1)" } }}
                            className="h-[260px] w-full"
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
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="vehicles" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
