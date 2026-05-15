"use client"

import { useEffect, useState } from "react"

import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { HistoryLayout } from "@/layouts/history-layout"

import { RangeTabs } from "@/components/range-tabs"
import { HistoryStats } from "@/components/history-stats"
import { HistoryTable } from "@/components/history-table"
import { ExportDialog } from "@/components/export-dialog"

import { fetchParkingStats, fetchSessions, type ParkingStats, type SessionRecord } from "@/services/parking"
import { type ParkingRange } from "@/configs/parking-range.config"
import { createSessionExportConfig } from "@/utils/session-export-utils"

const STORAGE_KEY = "history-range"
const DEFAULT_RANGE_MIGRATION_KEY = "history-range-default-week-v1"

export function HistoryPage() {
    const [range, setRange] = useState<ParkingRange>(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === "today" && !localStorage.getItem(DEFAULT_RANGE_MIGRATION_KEY)) {
            localStorage.setItem(DEFAULT_RANGE_MIGRATION_KEY, "done")
            return "week"
        }
        if (saved === "today" || saved === "week" || saved === "month" || saved === "all") {
            return saved
        }
        return "week"
    })

    const [stats, setStats] = useState<ParkingStats | null>(null)
    const [sessions, setSessions] = useState<SessionRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, range)
    }, [range])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(false)
        // Don't reset stats/sessions here — keep previous data visible under the overlay

        Promise.allSettled([
            fetchParkingStats(range),
            fetchSessions(range),
        ])
            .then(([statsResult, sessionsResult]) => {
                if (cancelled) return

                const hasError =
                    statsResult.status === "rejected" ||
                    sessionsResult.status === "rejected"

                if (statsResult.status === "fulfilled") {
                    setStats(statsResult.value)
                }

                if (sessionsResult.status === "fulfilled") {
                    setSessions(sessionsResult.value)
                }

                if (hasError) {
                    console.error("[history] Failed to load data", {
                        stats: statsResult.status === "rejected" ? statsResult.reason : null,
                        sessions: sessionsResult.status === "rejected" ? sessionsResult.reason : null,
                    })
                }

                setError(statsResult.status === "rejected")
            })
            .finally(() => {
                if (cancelled) return
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [range])

    return (
        <>
            <PageHeader
                title="Parking History Records"
                description="Monitor occupancy, revenue, and vehicle activity"
            />

            <PageContent>
                <HistoryLayout
                    tabs={
                        <RangeTabs
                            range={range}
                            onRangeChange={setRange}
                        />
                    }

                    stats={
                        <div className="relative">
                            {loading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm rounded-lg">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-muted-foreground">Fetching data...</p>
                                </div>
                            )}
                            <HistoryStats
                                stats={stats}
                                loading={false}
                                error={error}
                            />
                        </div>
                    }

                    table={
                        <div className="relative">
                            {loading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm rounded-lg">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-muted-foreground">Fetching data...</p>
                                </div>
                            )}
                            <HistoryTable
                                sessions={sessions}
                                loading={false}
                            />
                        </div>
                    }

                    tableActions={
                        <ExportDialog
                            config={createSessionExportConfig(range)}
                        />
                    }
                />
            </PageContent>
        </>
    )
}
