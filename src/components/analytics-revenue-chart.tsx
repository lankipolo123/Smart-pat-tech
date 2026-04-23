"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { revenueData } from "@/mocks/analytics.data"

export function AnalyticsRevenueChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue in ₱</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={{ revenue: { label: "Revenue (₱)", color: "var(--chart-2)" } }}
                    className="h-[250px] w-full"
                >
                    <LineChart data={revenueData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line dataKey="revenue" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
