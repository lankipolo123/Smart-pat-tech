"use client"

import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

type Props = {
    data: { date: string; desktop: number; mobile: number }[]
    title?: string
    description?: string
}

export function ChartBar({ data, title = "Bar Chart", description }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>

            <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <BarChart data={data}>
                        <CartesianGrid vertical={false} />

                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />

                        <Bar dataKey="desktop" fill="var(--chart-2)" />
                        <Bar dataKey="mobile" fill="var(--chart-1)" />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}