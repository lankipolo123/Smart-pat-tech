import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Settings, Trash2 } from "lucide-react"

type ZoneType = 'parking' | 'entry' | 'exit' | 'restricted'

type ZoneConfig = {
  slot?: string
  zone_type?: ZoneType
  points?: [number, number][]
}

type Props = {
  trigger: React.ReactNode
  zone?: ZoneConfig
  onSave?: (config: ZoneConfig) => void
  onDelete?: () => void
}

export function ZoneConfigDialog({ trigger, zone, onSave, onDelete }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ZoneConfig>({
    slot: zone?.slot || '',
    zone_type: zone?.zone_type || 'parking',
    points: zone?.points || []
  })

  const handleSave = () => {
    onSave?.(config)
    setIsOpen(false)
  }

  const handleDelete = () => {
    onDelete?.()
    setIsOpen(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {zone ? 'Edit Zone' : 'Add Zone'}
          </DialogTitle>
          <DialogDescription>
            Configure parking zone settings and properties
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field>
            <FieldLabel htmlFor="zone-slot">Zone Slot</FieldLabel>
            <FieldContent>
              <Input
                id="zone-slot"
                type="text"
                placeholder="A1, B2, C3..."
                value={config.slot || ''}
                onChange={(e) => setConfig({ ...config, slot: e.target.value })}
              />
              <FieldDescription>
                Unique identifier for the parking zone
              </FieldDescription>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="zone-type">Zone Type</FieldLabel>
            <FieldContent>
              <Select
                value={config.zone_type}
                onValueChange={(value: ZoneType | null) => {
                  if (value) setConfig({ ...config, zone_type: value })
                }}
              >
                <SelectTrigger id="zone-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Type of zone for different parking behaviors
              </FieldDescription>
            </FieldContent>
          </Field>
        </div>

        <DialogFooter>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>

            <div className="flex gap-2">
              {zone && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}

              <Button
                type="button"
                onClick={handleSave}
              >
                <Settings className="mr-2 h-4 w-4" />
                {zone ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
