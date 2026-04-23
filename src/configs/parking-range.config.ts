export const parkingRanges = [
    { key: "today", label: "Today" },
    { key: "week", label: "Last 7 Days" },
    { key: "month", label: "Last 30 Days" },
    { key: "all", label: "All Time" },
] as const

export type ParkingRange =
    (typeof parkingRanges)[number]["key"]