"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { vehicleData, vehicleTypeBreakdown } from "@/mocks/analytics.data"

export function AnalyticsVehicleChart() {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Monthly vehicle count */}
            <Card>
                <CardHeader>
                    <CardTitle>Vehicle Activity</CardTitle>
                    <CardDescription>Total vehicles per month</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer
                        config={{ vehicles: { label: "Vehicles", color: "var(--chart-1)" } }}
                        className="h-[220px] w-full"
                    >
                        <BarChart data={vehicleData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="vehicles" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Vehicle type breakdown table */}
            <Card>
                <CardHeader>
                    <CardTitle>Vehicle Breakdown</CardTitle>
                    <CardDescription>Count and revenue by vehicle type</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Count</th>
                                <th className="px-4 py-3">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicleTypeBreakdown.map((row, i) => (
                                <tr
                                    key={row.type}
                                    className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                                >
                                    <td className="px-4 py-3 font-medium">{row.type}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{row.count}</td>
                                    <td className="px-4 py-3 font-medium text-primary">₱{row.revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
