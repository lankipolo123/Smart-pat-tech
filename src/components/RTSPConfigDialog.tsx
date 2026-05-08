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
import { Label } from "@/components/ui/label"
import { Video, Loader2 } from "lucide-react"

type Props = {
  trigger: React.ReactNode
  onAddRtsp: (url: string, name: string) => Promise<void>
}

export function RTSPConfigDialog({ trigger, onAddRtsp }: Props) {
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      return
    }

    setIsLoading(true)
    try {
      await onAddRtsp?.(url, name)
      setUrl("")
      setName("")
    } catch (error) {
      console.error('Failed to add RTSP source:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Add RTSP Camera
          </DialogTitle>
          <DialogDescription>
            Add an RTSP camera stream to your video sources. The camera will appear in the table once added.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rtsp-url">RTSP URL</Label>
            <Input
              id="rtsp-url"
              type="text"
              placeholder="rtsp://username:password@ip:port/stream"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Example: rtsp://admin:password@192.168.1.100:554/stream1
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="camera-name">Camera Name (Optional)</Label>
            <Input
              id="camera-name"
              type="text"
              placeholder="Front Door Camera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Add Camera
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
