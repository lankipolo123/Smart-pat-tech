import { useState, useCallback, useRef } from 'react'
import {
  fetchCameras,
  fetchSources,
  switchToWebcam,
  activateSource as activateSourceApi,
  uploadVideo,
  createSource as createSourceApi,
  deleteSource as deleteSourceApi,
  type VideoSource,
} from '@/services/camera'

type CameraDevice = {
  index: number
  name: string
}

export function useVideoSources() {
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [sources, setSources] = useState<VideoSource[]>([])
  const [activeLabel, setActiveLabel] = useState("Camera 0")
  const [rtspUrl, setRtspUrl] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const loadCameras = useCallback(async () => {
    try {
      const data = await fetchCameras()
      // fetchCameras returns Camera[], map to CameraDevice shape
      const devices: CameraDevice[] = data.map((c, i) => ({
        index: i,
        name: c.name,
      }))
      setCameras(devices)
    } catch (error) {
      console.error("Failed to load cameras:", error)
    }
  }, [])

  const loadSources = useCallback(async () => {
    try {
      const data = await fetchSources()
      setSources(data)
      const active = data.find((source) => source.active === 1)
      if (active) {
        setActiveLabel(active.name)
      }
    } catch (error) {
      console.error("Failed to load sources:", error)
    }
  }, [])

  const switchWebcam = useCallback(async (index: number, name: string) => {
    try {
      await switchToWebcam(index)
      setActiveLabel(name)
    } catch (error) {
      console.error("Failed to switch webcam:", error)
      alert("Failed to switch camera")
    }
  }, [])

  const activateSource = useCallback(async (source: VideoSource) => {
    try {
      await activateSourceApi(source.id)
      await loadSources()
    } catch (error) {
      console.error("Failed to activate source:", error)
      alert("Failed to activate source")
    }
  }, [loadSources])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadVideo(file)
    setActiveLabel(file.name)
    await loadSources()
  }, [loadSources])

  const addRtspSource = useCallback(async () => {
    if (!rtspUrl.trim()) {
      alert("Please enter a valid RTSP URL")
      return
    }
    try {
      await createSourceApi({
        name: `RTSP ${new URL(rtspUrl).hostname || rtspUrl}`,
        type: "rtsp",
        url: rtspUrl.trim(),
      })
      setRtspUrl("")
      await loadSources()
    } catch {
      alert("Failed to add RTSP source. Please check the URL format.")
    }
  }, [rtspUrl, loadSources])

  const deleteSource = useCallback(async (id: number) => {
    await deleteSourceApi(id)
    await loadSources()
  }, [loadSources])

  return {
    cameras,
    sources,
    activeLabel,
    rtspUrl,
    setRtspUrl,
    fileRef,
    loadCameras,
    loadSources,
    switchWebcam,
    activateSource,
    handleFileUpload,
    addRtspSource,
    deleteSource,
  }
}