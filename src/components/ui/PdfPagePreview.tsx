import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../../lib/utils'

interface PdfPagePreviewProps {
  file: File
  pageNumber?: number
  className?: string
  canvasClassName?: string
  scale?: number
  maxHeight?: number
}

export function PdfPagePreview({
  file,
  pageNumber = 1,
  className = "",
  canvasClassName = "",
  scale = 1.4,
  maxHeight = 640
}: PdfPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)
  const fileRef = useRef<File | null>(null)
  const renderTaskRef = useRef<any>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isRendering, setIsRendering] = useState(true)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => {
      setContainerWidth(Math.floor(element.getBoundingClientRect().width))
    }

    updateWidth()

    const ResizeObserverCtor = window.ResizeObserver
    if (!ResizeObserverCtor) {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserverCtor(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      if (!canvasRef.current) return
      setIsRendering(true)

      try {
        renderTaskRef.current?.cancel?.()

        if (!pdfDocRef.current || fileRef.current !== file) {
          pdfDocRef.current?.destroy?.()
          const buffer = await file.arrayBuffer()
          pdfDocRef.current = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
          fileRef.current = file
        }

        const pdf = pdfDocRef.current
        const actualPageNumber = Math.min(Math.max(1, pageNumber), pdf.numPages)
        const page = await pdf.getPage(actualPageNumber)

        if (cancelled) return

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        const baseViewport = page.getViewport({ scale: 1, rotation: page.rotate })
        const availableWidth = Math.max(containerWidth || containerRef.current?.getBoundingClientRect().width || 360, 120)
        const widthScale = (availableWidth - 2) / baseViewport.width
        const heightScale = maxHeight / baseViewport.height
        const cssScale = Math.max(0.1, Math.min(widthScale, heightScale, scale))
        const cssViewport = page.getViewport({ scale: cssScale, rotation: page.rotate })
        const pixelRatio = Math.max(window.devicePixelRatio || 1, 2.5)
        const renderViewport = page.getViewport({ scale: cssScale * pixelRatio, rotation: page.rotate })

        canvas.width = Math.floor(renderViewport.width)
        canvas.height = Math.floor(renderViewport.height)
        canvas.style.width = `${Math.floor(cssViewport.width)}px`
        canvas.style.height = `${Math.floor(cssViewport.height)}px`

        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        const task = page.render({
          canvas,
          canvasContext: context,
          viewport: renderViewport
        })
        renderTaskRef.current = task
        await task.promise

        if (!cancelled) setIsRendering(false)
      } catch (e) {
        if ((e as any)?.name !== 'RenderingCancelledException') {
          console.error("Preview failed", e)
        }
        if (!cancelled) setIsRendering(false)
      }
    }

    render()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel?.()
    }
  }, [file, pageNumber, scale, maxHeight, containerWidth])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-lg flex items-center justify-center bg-white w-full", className)}
    >
      {isRendering ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
          Rendering
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className={cn("block max-w-full h-auto transition-opacity duration-150", isRendering && "opacity-40", canvasClassName)}
      />
    </div>
  )
}
