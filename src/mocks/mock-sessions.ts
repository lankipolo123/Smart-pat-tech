import { type SessionRecord } from "@/services/parking"

export const mockSessions: SessionRecord[] = [
    {
        id: 1,
        slot: "S0001",
        plate: "ABC 1234",
        entry: new Date(Date.now() - 1000 * 60 * 90).toISOString(),  // 90 min ago
        exit: new Date(Date.now() - 1000 * 60 * 30).toISOString(),   // 30 min ago
        durationMin: 60,
        bill: 60.00,
    },
    {
        id: 2,
        slot: "S0002",
        plate: "XYZ 5678",
        entry: new Date(Date.now() - 1000 * 60 * 45).toISOString(),  // 45 min ago
        exit: null,                                                    // still parked
        durationMin: null,
        bill: null,
    },
    {
        id: 3,
        slot: "S0001",
        plate: "DEF 9012",
        entry: new Date(Date.now() - 1000 * 60 * 200).toISOString(), // 3h 20m ago
        exit: new Date(Date.now() - 1000 * 60 * 120).toISOString(),  // 2h ago
        durationMin: 80,
        bill: 80.00,
    },
    {
        id: 4,
        slot: "S0003",
        plate: "GHI 3456",
        entry: new Date(Date.now() - 1000 * 60 * 15).toISOString(),  // 15 min ago
        exit: null,
        durationMin: null,
        bill: null,
    },
    {
        id: 5,
        slot: "S0002",
        plate: "JKL 7890",
        entry: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5h ago
        exit: new Date(Date.now() - 1000 * 60 * 240).toISOString(),  // 4h ago
        durationMin: 60,
        bill: 60.00,
    },
    {
        id: 6,
        slot: "S0004",
        plate: "MNO 1122",
        entry: new Date(Date.now() - 1000 * 60 * 10).toISOString(),  // 10 min ago
        exit: null,
        durationMin: null,
        bill: null,
    },
    {
        id: 7,
        slot: "S0003",
        plate: "PQR 3344",
        entry: new Date(Date.now() - 1000 * 60 * 400).toISOString(), // 6h 40m ago
        exit: new Date(Date.now() - 1000 * 60 * 350).toISOString(),  // 5h 50m ago
        durationMin: 50,
        bill: 50.00,
    },
    {
        id: 8,
        slot: "S0005",
        plate: "STU 5566",
        entry: new Date(Date.now() - 1000 * 60 * 5).toISOString(),   // 5 min ago
        exit: null,
        durationMin: null,
        bill: null,
    },
]