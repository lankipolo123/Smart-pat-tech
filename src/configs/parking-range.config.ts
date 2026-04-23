export const parkingRanges = [
    { key: "today", label: "Today" },
    { key: "week", label: "7 Days" },
    { key: "month", label: "30 Days" },
    { key: "all", label: "All Time" },
] as const

export type ParkingRange =
    (typeof parkingRanges)[number]["key"]