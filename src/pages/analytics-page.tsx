"use client"

import { useEffect, useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { AnalyticsLayout } from "@/layouts/analytics-layout"

import { AnalyticsStats } from "@/components/analytics-stats"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { AnalyticsActivityChart } from "@/components/analytics-activity-chart"
import { ExportDialog } from "@/components/export-dialog"

import {
    fetchAnalyticsStats,
    fetchRevenueData,
    fetchVehicleData,
    fetchActivityData,
    type AnalyticsStats as AnalyticsStatsType,
    type RevenuePoint,
    type VehiclePoint,
    type ActivityPoint,
} from "@/services/analytics"

import { createAnalyticsExportConfig } from "@/utils/analytics-export.config"

export function AnalyticsPage() {
    const [stats, setStats] = useState<AnalyticsStatsType | null>(null)
    const [revenueData, setRevenueData] = useState<RevenuePoint[]>([])
    const [vehicleData, setVehicleData] = useState<VehiclePoint[]>([])
    const [activityData, setActivityData] = useState<ActivityPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(false)

        Promise.allSettled([
            fetchAnalyticsStats(),
            fetchRevenueData(),
            fetchVehicleData(),
            fetchActivityData(),
        ])
            .then(([statsResult, revenueResult, vehiclesResult, activityResult]) => {
                if (cancelled) return

                const hasError = [
                    statsResult,
                    revenueResult,
                    vehiclesResult,
                    activityResult,
                ].some((result) => result.status === "rejected")

                if (statsResult.status === "fulfilled") {
                    setStats(statsResult.value)
                }
                if (revenueResult.status === "fulfilled") {
                    setRevenueData(revenueResult.value)
                }
                if (vehiclesResult.status === "fulfilled") {
                    setVehicleData(vehiclesResult.value)
                }
                if (activityResult.status === "fulfilled") {
                    setActivityData(activityResult.value)
                }

                if (hasError) {
                    console.error("[analytics] Failed to load data", {
                        stats: statsResult.status === "rejected" ? statsResult.reason : null,
                        revenue: revenueResult.status === "rejected" ? revenueResult.reason : null,
                        vehicles: vehiclesResult.status === "rejected" ? vehiclesResult.reason : null,
                        activity: activityResult.status === "rejected" ? activityResult.reason : null,
                    })
                }

                setError(statsResult.status === "rejected")
            })
            .finally(() => {
                if (cancelled) return
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [])

    return (
        <>
            <PageHeader
                title="Statistical Content"
                description="Track revenue, vehicles, and parking performance"
            />

            <PageContent>
                <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm rounded-lg">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Fetching data...</p>
                        </div>
                    )}
                    <div className={loading ? "pointer-events-none select-none" : ""}>
                        <AnalyticsLayout
                            stats={
                                <AnalyticsStats
                                    stats={stats}
                                    loading={loading}
                                    error={error}
                                />
                            }
                            charts={
                                <AnalyticsCharts
                                    revenueData={revenueData}
                                    vehicleData={vehicleData}
                                    loading={loading}
                                />
                            }
                            actions={
                                <ExportDialog config={createAnalyticsExportConfig()} />
                            }
                            activity={
                                <AnalyticsActivityChart
                                    data={activityData}
                                    loading={loading}
                                />
                            }
                        />
                    </div>
                </div>
            </PageContent>
        </>
    )
}
