"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { fetchActivityData, type ActivityPoint } from "@/services/analytics"

export function AnalyticsActivityChart() {
    const [data, setData] = useState<ActivityPoint[]>([])

    useEffect(() => { fetchActivityData().then(setData) }, [])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vehicle Activity</CardTitle>
                <CardDescription>Vehicles per day this week</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={{ vehicles: { label: "Vehicles", color: "var(--chart-1)" } }}
                    className="h-[250px] w-full"
                >
                    <BarChart data={data}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="vehicles" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
