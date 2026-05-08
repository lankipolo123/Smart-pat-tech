import { useState, useCallback } from 'react'
import { type Zone, type ZoneType } from '@/types'
import { fetchZones, createZone, updateZone as updateZoneApi, deleteZone as deleteZoneApi } from '@/services/camera'

export type Point = {
  x: number
  y: number
}

export function useZones() {
  const [zones, setZones] = useState<Zone[]>([])
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [slotName, setSlotName] = useState("")
  const [highlightedId, setHighlightedId] = useState<number>()
  const [saving, setSaving] = useState(false)
  const [zoneType, setZoneType] = useState<ZoneType>('parking')

  const loadZones = useCallback(async () => {
    try {
      const data = await fetchZones()
      setZones(data)
    } catch (error) {
      console.error("Failed to load zones:", error)
    }
  }, [])

  const saveZone = useCallback(async () => {
    if (points.length < 3) {
      alert("Need at least 3 points")
      return
    }
    if (!slotName.trim()) {
      alert("Enter slot name")
      return
    }

    setSaving(true)
    try {
      await createZone(
        slotName.trim(),
        points.map((p) => [Math.round(p.x), Math.round(p.y)]),
        zoneType,
      )
      setPoints([])
      setDrawing(false)
      setSlotName("")
      await loadZones()
    } catch (error) {
      console.error("Failed to save zone:", error)
      alert("Failed to save zone")
    } finally {
      setSaving(false)
    }
  }, [points, slotName, zoneType, loadZones])

  const createZoneFromDraw = useCallback(async (
    zonePoints: number[][],
    rawSlotName: string,
    type: ZoneType = 'parking',
  ): Promise<boolean> => {
    if (!rawSlotName.trim() || zonePoints.length < 3) return false
    try {
      await createZone(rawSlotName.trim(), zonePoints, type)
      await loadZones()
      return true
    } catch (error) {
      console.error("Failed to create drawn zone:", error)
      return false
    }
  }, [loadZones])

  const updateZone = useCallback(async (
    id: number,
    updatedSlot: string,
    updatedPoints: number[][],
    type: ZoneType = 'parking',
  ) => {
    await updateZoneApi(id, updatedSlot, updatedPoints, type)
    await loadZones()
  }, [loadZones])

  const deleteZone = useCallback(async (id?: number) => {
    if (!id) return
    try {
      await deleteZoneApi(id)
      if (highlightedId === id) setHighlightedId(undefined)
      await loadZones()
    } catch (error) {
      console.error("Failed to delete zone:", error)
      alert("Failed to delete zone")
    }
  }, [highlightedId, loadZones])

  const startDraw = useCallback(() => {
    setPoints([])
    setDrawing(true)
  }, [])

  const cancelDraw = useCallback(() => {
    setPoints([])
    setDrawing(false)
    setSlotName("")
  }, [])

  const handleStageClick = useCallback((e: any) => {
    if (!drawing) return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setPoints((prev) => [...prev, { x: pos.x, y: pos.y }])
  }, [drawing])

  const handleHighlight = useCallback((zone: Zone) => {
    setHighlightedId((prev) => (prev === zone.id ? undefined : zone.id))
  }, [])

  const undoLastPoint = useCallback(() => {
    setPoints((p) => p.slice(0, -1))
  }, [])

  return {
    zones,
    drawing,
    points,
    slotName,
    highlightedId,
    saving,
    zoneType,
    setSlotName,
    setZoneType,
    loadZones,
    saveZone,
    createZoneFromDraw,
    updateZone,
    deleteZone,
    startDraw,
    cancelDraw,
    handleStageClick,
    handleHighlight,
    undoLastPoint,
  }
}