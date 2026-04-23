import type { ParkingRange } from "@/configs/parking-range.config"

type ParkingPoint = {
    date: string
    entries: number
    exits: number
}

export const parkingHistoryData: Record<ParkingRange, ParkingPoint[]> = {
    today: [
        { date: "Now", entries: 42, exits: 30 },
    ],

    week: [
        { date: "Mon", entries: 120, exits: 90 },
        { date: "Tue", entries: 150, exits: 110 },
        { date: "Wed", entries: 180, exits: 140 },
        { date: "Thu", entries: 200, exits: 160 },
        { date: "Fri", entries: 220, exits: 170 },
        { date: "Sat", entries: 240, exits: 190 },
        { date: "Sun", entries: 210, exits: 180 },
    ],

    month: [
        { date: "Week 1", entries: 800, exits: 650 },
        { date: "Week 2", entries: 950, exits: 720 },
        { date: "Week 3", entries: 1100, exits: 900 },
        { date: "Week 4", entries: 1200, exits: 980 },
    ],

    all: [
        { date: "Apr", entries: 4200, exits: 3900 },
        { date: "May", entries: 5000, exits: 4600 },
        { date: "Jun", entries: 5800, exits: 5400 },
    ],
}