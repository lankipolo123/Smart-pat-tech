import type { ParkingRange } from "@/configs/parking-range.config"

export type ParkingStats = {
    totalSessions: number
    totalRevenue: number
    avgDuration: number
    avgCharge: number
    occupancyCurrent: number
    occupancyTotal: number
    vehicleTurnover: number
}

export type ChartPoint = {
    label: string
    vehicles: number
}

export type SessionRecord = {
    id: string
    slot: string
    plate: string
    entry: string
    exit: string | null
    durationMin: number | null
    bill: number | null
}

export type ParkingRangeData = {
    stats: ParkingStats
    chartData: ChartPoint[]
    sessions: SessionRecord[]
}

const todayHours: ChartPoint[] = Array.from({ length: 24 }, (_, i) => ({
    label: `${i}:00`,
    vehicles: [0,0,0,0,0,0,1,2,4,5,6,4,5,3,4,5,6,5,7,8,4,3,2,1][i] ?? 0,
}))

export const parkingHistoryData: Record<ParkingRange, ParkingRangeData> = {
    today: {
        stats: {
            totalSessions: 1,
            totalRevenue: 50,
            avgDuration: 60,
            avgCharge: 50,
            occupancyCurrent: 0,
            occupancyTotal: 10,
            vehicleTurnover: 1,
        },
        chartData: todayHours,
        sessions: [
            { id: "1", slot: "A1", plate: "ABC 1234", entry: "19:00", exit: "20:00", durationMin: 60, bill: 50 },
        ],
    },

    week: {
        stats: {
            totalSessions: 84,
            totalRevenue: 4200,
            avgDuration: 55,
            avgCharge: 50,
            occupancyCurrent: 3,
            occupancyTotal: 10,
            vehicleTurnover: 12,
        },
        chartData: [
            { label: "Mon", vehicles: 10 },
            { label: "Tue", vehicles: 14 },
            { label: "Wed", vehicles: 12 },
            { label: "Thu", vehicles: 15 },
            { label: "Fri", vehicles: 18 },
            { label: "Sat", vehicles: 8 },
            { label: "Sun", vehicles: 7 },
        ],
        sessions: [
            { id: "1", slot: "A1", plate: "ABC 1234", entry: "Mon 08:10", exit: "Mon 09:30", durationMin: 80, bill: 60 },
            { id: "2", slot: "B2", plate: "XYZ 5678", entry: "Tue 10:00", exit: "Tue 12:00", durationMin: 120, bill: 100 },
            { id: "3", slot: "A3", plate: "DEF 9012", entry: "Wed 14:00", exit: "Wed 15:30", durationMin: 90, bill: 75 },
            { id: "4", slot: "C1", plate: "GHI 3456", entry: "Thu 09:00", exit: "Thu 11:00", durationMin: 120, bill: 100 },
            { id: "5", slot: "A2", plate: "JKL 7890", entry: "Fri 17:00", exit: "Fri 18:30", durationMin: 90, bill: 75 },
        ],
    },

    month: {
        stats: {
            totalSessions: 340,
            totalRevenue: 17000,
            avgDuration: 58,
            avgCharge: 50,
            occupancyCurrent: 4,
            occupancyTotal: 10,
            vehicleTurnover: 11,
        },
        chartData: [
            { label: "Week 1", vehicles: 75 },
            { label: "Week 2", vehicles: 88 },
            { label: "Week 3", vehicles: 92 },
            { label: "Week 4", vehicles: 85 },
        ],
        sessions: [
            { id: "1", slot: "A1", plate: "ABC 1234", entry: "Apr 1 08:00", exit: "Apr 1 10:00", durationMin: 120, bill: 100 },
            { id: "2", slot: "B3", plate: "MNO 2345", entry: "Apr 3 11:00", exit: "Apr 3 12:30", durationMin: 90, bill: 75 },
            { id: "3", slot: "C2", plate: "PQR 6789", entry: "Apr 7 09:00", exit: "Apr 7 11:00", durationMin: 120, bill: 100 },
            { id: "4", slot: "A4", plate: "STU 1122", entry: "Apr 10 14:00", exit: "Apr 10 15:00", durationMin: 60, bill: 50 },
            { id: "5", slot: "B1", plate: "VWX 3344", entry: "Apr 15 08:30", exit: "Apr 15 10:30", durationMin: 120, bill: 100 },
        ],
    },

    all: {
        stats: {
            totalSessions: 1280,
            totalRevenue: 64000,
            avgDuration: 56,
            avgCharge: 50,
            occupancyCurrent: 2,
            occupancyTotal: 10,
            vehicleTurnover: 10,
        },
        chartData: [
            { label: "Jan", vehicles: 290 },
            { label: "Feb", vehicles: 310 },
            { label: "Mar", vehicles: 340 },
            { label: "Apr", vehicles: 340 },
        ],
        sessions: [
            { id: "1", slot: "A1", plate: "ABC 1234", entry: "Jan 5 08:00", exit: "Jan 5 10:00", durationMin: 120, bill: 100 },
            { id: "2", slot: "B2", plate: "XYZ 5678", entry: "Feb 12 09:00", exit: "Feb 12 11:00", durationMin: 120, bill: 100 },
            { id: "3", slot: "C3", plate: "DEF 9012", entry: "Mar 20 10:00", exit: "Mar 20 12:00", durationMin: 120, bill: 100 },
            { id: "4", slot: "A2", plate: "GHI 3456", entry: "Apr 1 08:30", exit: "Apr 1 10:00", durationMin: 90, bill: 75 },
            { id: "5", slot: "B3", plate: "JKL 7890", entry: "Apr 10 14:00", exit: "Apr 10 15:30", durationMin: 90, bill: 75 },
        ],
    },
}
