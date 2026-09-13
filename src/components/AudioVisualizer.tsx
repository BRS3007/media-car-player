'use client'

import { useEffect, useRef } from 'react'
import { getAudioContext } from '@/lib/audio'

interface AudioVisualizerProps {
  media: HTMLMediaElement | null
  playing: boolean
  bars?: number
}

interface GraphState {
  media: HTMLMediaElement | null
  analyser: AnalyserNode | null
  source: MediaElementAudioSourceNode | null
}

export default function AudioVisualizer({ media, playing, bars = 36 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const graphRef = useRef<GraphState>({ media: null, analyser: null, source: null })
  const sizeRef = useRef({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setupGraph = () => {
      if (graphRef.current.media === media) return
      if (graphRef.current.source) {
        graphRef.current.source.disconnect()
        graphRef.current.analyser?.disconnect()
      }
      const ctx = getAudioContext()
      if (ctx && media) {
        try {
          const source = ctx.createMediaElementSource(media)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.82
          source.connect(analyser)
          analyser.connect(ctx.destination)
          graphRef.current = { media, source, analyser }
        } catch {
          graphRef.current = { media: null, source: null, analyser: null }
        }
      } else {
        graphRef.current = { media: media ?? null, source: null, analyser: null }
      }
    }
    setupGraph()

    const ctx2d = canvas.getContext('2d')
    const analyser = graphRef.current.analyser
    const data = new Uint8Array(analyser?.frequencyBinCount ?? 0)

    const ensureSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width && sizeRef.current.width !== Math.round(rect.width)) {
        canvas.width = Math.round(rect.width)
        sizeRef.current.width = canvas.width
      }
      if (rect.height && sizeRef.current.height !== Math.round(rect.height)) {
        canvas.height = Math.round(rect.height)
        sizeRef.current.height = canvas.height
      }
    }

    let raf = 0

    const draw = () => {
      ensureSize()
      if (canvas.width === 0 || canvas.height === 0) {
        raf = requestAnimationFrame(draw)
        return
      }
      if (analyser) analyser.getByteFrequencyData(data)

      ctx2d?.clearRect(0, 0, canvas.width, canvas.height)

      const count = bars
      const gap = Math.max(6, Math.floor(canvas.width / count) * 0.35)
      const bw = Math.floor((canvas.width - gap * (count - 1)) / count)
      const x0 = 0
      const base = canvas.height
      ctx2d!.fillStyle = '#0c4a6e'
      ctx2d!.fillRect(0, base - 2, canvas.width, 2)

      for (let i = 0; i < count; i++) {
        let v: number
        if (analyser) {
          const idx = Math.min(data.length - 1, Math.floor(i * 1.6))
          v = data[idx] / 255
        } else {
          v = 0.35 + 0.35 * Math.sin(Date.now() / 240 + i * 1.1)
        }
        const h = Math.max(6, v * (canvas.height - 8))
        const x = x0 + i * (bw + gap)
        const y = base - h

        const grad = ctx2d!.createLinearGradient(0, y, 0, base)
        grad.addColorStop(0, '#7dd3fc')
        grad.addColorStop(0.5, '#38bdf8')
        grad.addColorStop(1, '#0369a1')
        ctx2d!.fillStyle = grad
        const r = Math.min(bw / 2, 6)
        ctx2d!.beginPath()
        ctx2d!.moveTo(x, base)
        ctx2d!.lineTo(x, y + r)
        ctx2d!.quadraticCurveTo(x, y, x + r, y)
        ctx2d!.lineTo(x + bw - r, y)
        ctx2d!.quadraticCurveTo(x + bw, y, x + bw, y + r)
        ctx2d!.lineTo(x + bw, base)
        ctx2d!.closePath()
        ctx2d!.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    if (playing) {
      const ctx = getAudioContext()
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
    }
  }, [media, playing, bars])

  useEffect(() => {
    return () => {
      if (graphRef.current.source) {
        graphRef.current.source.disconnect()
        graphRef.current.analyser?.disconnect()
      }
      graphRef.current = { media: null, analyser: null, source: null }
    }
  }, [media])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full opacity-90"
      aria-hidden
    />
  )
}