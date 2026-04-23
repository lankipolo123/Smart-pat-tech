export type SlotStatus = "available" | "occupied" | "reserved"

export type ParkingSlot = {
    id: string
    slot: string
    status: SlotStatus
    plate?: string
    since?: string
}

export const parkingSlotsData: ParkingSlot[] = [
    { id: "1",  slot: "A1", status: "occupied",  plate: "ABC 1234", since: "08:12" },
    { id: "2",  slot: "A2", status: "available" },
    { id: "3",  slot: "A3", status: "reserved",  plate: "DEF 5678" },
    { id: "4",  slot: "A4", status: "available" },
    { id: "5",  slot: "A5", status: "available" },
    { id: "6",  slot: "B1", status: "occupied",  plate: "GHI 9012", since: "09:45" },
    { id: "7",  slot: "B2", status: "available" },
    { id: "8",  slot: "B3", status: "occupied",  plate: "JKL 3456", since: "10:30" },
    { id: "9",  slot: "B4", status: "reserved",  plate: "MNO 7890" },
    { id: "10", slot: "B5", status: "available" },
]
