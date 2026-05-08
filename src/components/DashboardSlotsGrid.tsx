import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Zone } from "@/types"

interface DashboardSlotsGridProps {
    slots: Zone[]
}

export function DashboardSlotsGrid({ slots }: DashboardSlotsGridProps) {
    const occupied = slots.filter(slot => slot.occupied).length
    const free = slots.length - occupied

    return (
        <Card className="shadow-md border-0 bg-background/95 backdrop-blur-sm">
            <CardHeader className="py-4 px-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold">
                            Parking Slots Status
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                            Real-time occupancy monitoring for all configured zones
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                            {slots.length} Total
                        </Badge>
                        <Badge variant="destructive" className="text-xs px-2 py-1">
                            {occupied} Occupied
                        </Badge>
                        <Badge variant="default" className="text-xs px-2 py-1">
                            {free} Available
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {slots.map((slot) => (
                        <div 
                            key={slot.id}
                            className={`
                                p-3 rounded-lg border-2 transition-all duration-200
                                ${slot.occupied 
                                    ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">
                                    {slot.slot}
                                </span>
                                <Badge 
                                    variant={slot.occupied ? "destructive" : "default"}
                                    className="text-xs"
                                >
                                    {slot.occupied ? "Occupied" : "Available"}
                                </Badge>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                                Zone ID: {slot.id}
                            </div>
                            
                            {slot.occupied && (
                                <div className="text-xs text-red-600 font-medium">
                                    Vehicle Detected
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
