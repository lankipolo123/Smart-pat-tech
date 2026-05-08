// components/CameraConfigDialog.tsx
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
import { Camera, Video, FileVideo } from "lucide-react"
import {
  createCamera,
  activateCamera,
  type CameraConfig,
  type CameraType,
} from "@/services/camera"

type Props = {
  trigger: React.ReactNode
  onSave?: (config: CameraConfig) => void
  onCameraAdded?: () => void
}

const DEFAULT_CONFIG: CameraConfig = {
  cameraType: "rtsp",
  rtspPort: "554",
  rtspTransport: "tcp",
  rtspPaths: "live/ch0,stream1,live.sdp",
}

export function CameraConfigDialog({ trigger, onSave, onCameraAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<CameraConfig>(DEFAULT_CONFIG)

  const validate = (): boolean => {
    if (!config.cameraType) {
      setError("Camera type is required")
      return false
    }
    if (config.cameraType === "rtsp" && !config.rtspUrl) {
      setError("RTSP URL is required")
      return false
    }
    if (config.cameraType === "ip_camera" && !config.cameraIp) {
      setError("Camera IP is required")
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const created = await createCamera(config)
      await activateCamera(created.id)

      onSave?.(config)
      onCameraAdded?.()
      setConfig(DEFAULT_CONFIG)
      setOpen(false)
    } catch (err) {
      setError("Failed to save camera configuration")
      console.error("Failed to save camera:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const update = (patch: Partial<CameraConfig>) =>
    setConfig(prev => ({ ...prev, ...patch }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger nativeButton={false}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="!max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Configure Camera
          </DialogTitle>
          <DialogDescription>
            Save camera settings to database and activate it for CCTV feed.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="camera-type" className="tracking-wide">CAMERA TYPE</FieldLabel>
            <FieldContent>
              <Select
                value={config.cameraType}
                onValueChange={(v: CameraType | null) => {
                  if (v) update({ cameraType: v })
                }}
              >
                <SelectTrigger id="camera-type" className="text-base h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rtsp">
                    <div className="flex items-center gap-2"><Video className="h-4 w-4" /> RTSP Stream</div>
                  </SelectItem>
                  <SelectItem value="ip_camera">
                    <div className="flex items-center gap-2"><Camera className="h-4 w-4" /> IP Camera</div>
                  </SelectItem>
                  <SelectItem value="usb">
                    <div className="flex items-center gap-2"><Camera className="h-4 w-4" /> USB / Webcam</div>
                  </SelectItem>
                  <SelectItem value="video_file">
                    <div className="flex items-center gap-2"><FileVideo className="h-4 w-4" /> Video File</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          {(config.cameraType === "rtsp" || config.cameraType === "ip_camera") && (
            <Field>
              <FieldLabel htmlFor="transport" className="tracking-wide">TRANSPORT</FieldLabel>
              <FieldContent>
                <Select
                  value={config.rtspTransport ?? "tcp"}
                  onValueChange={(v: string | null) => {
                    if (v) update({ rtspTransport: v })
                  }}
                >
                  <SelectTrigger id="transport" className="text-base h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="camera-name">Camera Name (Optional)</FieldLabel>
            <FieldContent>
              <Input
                id="camera-name"
                placeholder="Front Door Camera"
                value={config.cameraName ?? ""}
                onChange={(e) => update({ cameraName: e.target.value })}
                disabled={isLoading}
              />
            </FieldContent>
          </Field>

          {config.cameraType === "rtsp" && (
            <>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="rtsp-url">RTSP URL *</FieldLabel>
                <FieldContent>
                  <Input
                    id="rtsp-url"
                    placeholder="rtsp://admin:security_code@camera_ip:554/live/ch0"
                    value={config.rtspUrl ?? ""}
                    onChange={(e) => update({ rtspUrl: e.target.value })}
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    CAM720 format: rtsp://admin:security_code@camera_ip:554/live/ch0
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="rtsp-user">Username (Optional)</FieldLabel>
                <FieldContent>
                  <Input id="rtsp-user" placeholder="admin" value={config.rtspUser ?? ""} onChange={(e) => update({ rtspUser: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="rtsp-password">Password (Optional)</FieldLabel>
                <FieldContent>
                  <Input id="rtsp-password" type="password" autoComplete="new-password" placeholder="password" value={config.rtspPassword ?? ""} onChange={(e) => update({ rtspPassword: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
              <div className="md:col-span-2 rounded-md border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Minimum required for CAM720:</p>
                <p>1) Camera Type: RTSP</p>
                <p>2) RTSP URL: paste from your .env or CAM720 settings</p>
                <p>3) Save &amp; Connect</p>
              </div>
            </>
          )}

          {config.cameraType === "ip_camera" && (
            <>
              <Field>
                <FieldLabel htmlFor="camera-ip">IP Address *</FieldLabel>
                <FieldContent>
                  <Input id="camera-ip" placeholder="192.168.1.100" value={config.cameraIp ?? ""} onChange={(e) => update({ cameraIp: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="rtsp-port">RTSP Port</FieldLabel>
                <FieldContent>
                  <Input id="rtsp-port" placeholder="554" value={config.rtspPort ?? ""} onChange={(e) => update({ rtspPort: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="rtsp-user">Username (Optional)</FieldLabel>
                <FieldContent>
                  <Input id="rtsp-user" placeholder="admin" value={config.rtspUser ?? ""} onChange={(e) => update({ rtspUser: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="rtsp-password">Password (Optional)</FieldLabel>
                <FieldContent>
                  <Input id="rtsp-password" type="password" autoComplete="new-password" placeholder="password" value={config.rtspPassword ?? ""} onChange={(e) => update({ rtspPassword: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="rtsp-paths">Stream Paths (comma-separated)</FieldLabel>
                <FieldContent>
                  <Input id="rtsp-paths" placeholder="live.sdp,stream1,ch0" value={config.rtspPaths ?? ""} onChange={(e) => update({ rtspPaths: e.target.value })} disabled={isLoading} />
                  <FieldDescription>First path is used. CAM720 commonly uses live/ch0.</FieldDescription>
                </FieldContent>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="camera-mac">MAC Address (Optional)</FieldLabel>
                <FieldContent>
                  <Input id="camera-mac" placeholder="00:11:22:33:44:55" value={config.cameraMac ?? ""} onChange={(e) => update({ cameraMac: e.target.value })} disabled={isLoading} />
                </FieldContent>
              </Field>
            </>
          )}

          {config.cameraType === "usb" && (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="usb-device">Device Index or Path</FieldLabel>
              <FieldContent>
                <Input id="usb-device" placeholder="0  or  /dev/video0" value={config.usbDevice ?? ""} onChange={(e) => update({ usbDevice: e.target.value })} disabled={isLoading} />
                <FieldDescription>Enter 0 for first webcam, 1 for second, etc.</FieldDescription>
              </FieldContent>
            </Field>
          )}

          {config.cameraType === "video_file" && (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="video-file">Video File Path</FieldLabel>
              <FieldContent>
                <Input id="video-file" placeholder="/path/to/video.mp4" value={config.videoFile ?? ""} onChange={(e) => update({ videoFile: e.target.value })} disabled={isLoading} />
                <FieldDescription>Absolute path to the video file</FieldDescription>
              </FieldContent>
            </Field>
          )}

          <DialogFooter className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </span>
              ) : "Save & Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}