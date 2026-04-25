"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { parkingHistoryData } from "@/mocks/parking-history.data"
import { type ParkingRange } from "@/configs/parking-range.config"

type Props = {
    range: ParkingRange
}

const chartDescriptions: Record<ParkingRange, string> = {
    today: "Vehicles per hour",
    week: "Vehicles per day",
    month: "Vehicles per week",
    all: "Vehicles per month",
}

export function HistoryChart({ range }: Props) {
    const { chartData } = parkingHistoryData[range]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Hourly Activity</CardTitle>
                <CardDescription>{chartDescriptions[range]}</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={{ vehicles: { label: "Vehicles", color: "var(--chart-4)" } }}
                    className="h-[250px] w-full"
                >
                    <BarChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval={range === "today" ? 2 : 0}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="vehicles" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
