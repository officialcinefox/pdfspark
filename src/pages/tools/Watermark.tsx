import React, { useRef, useEffect, useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import toast from 'react-hot-toast'
import {
  Upload, Type, ImageIcon, Trash2, RotateCcw,
  Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  X, Check, Loader2, FileText, Plus, RotateCw, Move, Sliders, Type as FontIcon
} from 'lucide-react'
import { SEO } from '../../components/SEO'
import { Background } from '../../components/Background'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

// ─── Types ───────────────────────────────────────────────────────────────────

type WatermarkType = 'text' | 'image'
type TargetPages = 'all' | 'current'

interface WatermarkConfig {
  type: WatermarkType
  text: string
  fontIndex: number
  fontSize: number
  textColor: string
  opacity: number
  rotation: number
  scale: number
  x: number // center fractional X (0–1)
  y: number // center fractional Y (0–1)
}

interface DragState {
  startX: number
  startY: number
  startMouseX: number
  startMouseY: number
}

const WATERMARK_FONTS = [
  { name: 'Inter (Sans)', css: "'Inter', sans-serif" },
  { name: 'Dancing Script', css: "'Dancing Script', cursive" },
  { name: 'Pacifico', css: "'Pacifico', cursive" },
  { name: 'Great Vibes', css: "'Great Vibes', cursive" },
  { name: 'Satisfy', css: "'Satisfy', cursive" },
  { name: 'Sacramento', css: "'Sacramento', cursive" },
  { name: 'Outfit', css: "'Outfit', sans-serif" },
  { name: 'Playfair Display', css: "'Playfair Display', serif" },
]

const WATERMARK_COLORS = [
  { name: 'Soft Gray', hex: '#6b7280' },
  { name: 'Branding Red', hex: '#ef4444' },
  { name: 'Electric Blue', hex: '#3b82f6' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Deep Black', hex: '#000000' },
]

function loadGoogleFonts() {
  if (!document.getElementById('wm-fonts')) {
    const families = WATERMARK_FONTS.map(f => f.name.replace(/ /g, '+')).join('|')
    const link = document.createElement('link')
    link.id = 'wm-fonts'
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
    document.head.appendChild(link)
  }
}

// Helper to pre-render customized text as high-res PNG image for 100% accurate PDF output
function generateTextWatermarkPng(
  text: string,
  fontCss: string,
  fontSize: number,
  color: string
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  const scale = 3 // high resolution for crisp text
  const renderSize = fontSize * scale
  ctx.font = `bold ${renderSize}px ${fontCss}`
  
  const metrics = ctx.measureText(text)
  const textWidth = Math.max(20, Math.ceil(metrics.width))
  const textHeight = Math.max(10, Math.ceil(renderSize * 1.3))
  
  const pad = 16
  canvas.width = textWidth + pad * 2
  canvas.height = textHeight + pad * 2
  
  ctx.font = `bold ${renderSize}px ${fontCss}`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  ctx.fillText(text, pad, canvas.height / 2)
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width / scale,
    height: canvas.height / scale
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WatermarkTool() {
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  
  // Natural page dimensions (PDF units at scale 1)
  const [pageNaturalW, setPageNaturalW] = useState(595)
  const [pageNaturalH, setPageNaturalH] = useState(842)
  
  // Rendered image as data-url
  const [renderedPageUrl, setRenderedPageUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [containerW, setContainerW] = useState(0)

  // Watermark configuration
  const [wmConfig, setWmConfig] = useState<WatermarkConfig>({
    type: 'text',
    text: 'CONFIDENTIAL',
    fontIndex: 0,
    fontSize: 48,
    textColor: '#ef4444',
    opacity: 0.35,
    rotation: 45,
    scale: 0.5,
    x: 0.5,
    y: 0.5
  })
  
  // Uploaded watermark image file
  const [wmImageFile, setWmImageFile] = useState<File | null>(null)
  const [wmImagePreview, setWmImagePreview] = useState<string | null>(null)
  const [imageNaturalW, setImageNaturalW] = useState(200)
  const [imageNaturalH, setImageNaturalH] = useState(100)

  // Target pages
  const [applyTo, setApplyTo] = useState<TargetPages>('all')

  // Drag state
  const dragRef = useRef<DragState | null>(null)

  // Rendered page dimensions in px
  const [renderedW, setRenderedW] = useState(0)
  const [renderedH, setRenderedH] = useState(0)

  // Refs
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wmImageInputRef = useRef<HTMLInputElement>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // ── Mount ──
  useEffect(() => { loadGoogleFonts() }, [])

  // ── ResizeObserver: track available preview width ──
  useEffect(() => {
    const el = previewScrollRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      setContainerW(Math.max(200, el.clientWidth - 48))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [pdfFile])

  // ── Re-render when page/zoom/containerW change ──
  useEffect(() => {
    if (!pdfDoc || containerW === 0) return
    renderPage(pdfDoc, currentPage, zoom, containerW)
  }, [pdfDoc, currentPage, zoom, containerW])

  async function renderPage(
    doc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    zoomLevel: number,
    availableW: number
  ) {
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }
    setIsRendering(true)
    try {
      const page = await doc.getPage(pageNum)
      const naturalVp = page.getViewport({ scale: 1 })
      
      const fitScale = Math.min(availableW, 720) / naturalVp.width
      const renderScale = fitScale * zoomLevel

      const viewport = page.getViewport({ scale: renderScale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')!

      const task = page.render({ canvasContext: ctx, viewport, canvas })
      renderTaskRef.current = task
      await task.promise

      setPageNaturalW(naturalVp.width)
      setPageNaturalH(naturalVp.height)
      setRenderedW(Math.round(viewport.width))
      setRenderedH(Math.round(viewport.height))
      setRenderedPageUrl(canvas.toDataURL('image/png'))
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') console.error(e)
    } finally {
      setIsRendering(false)
    }
  }

  // ── File upload ──
  async function handleFileSelect(file: File) {
    if (!file.type.includes('pdf')) { toast.error('Please upload a valid PDF file.'); return }
    try {
      const buf = await file.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      setPdfFile(file)
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setRenderedPageUrl(null)
      toast.success(`PDF loaded — ${doc.numPages} page${doc.numPages > 1 ? 's' : ''}`)
    } catch {
      toast.error('Could not open this PDF. It may be corrupted or password-protected.')
    }
  }

  function onFileDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDraggingFile(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  // ── Image Watermark upload ──
  function handleWmImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(f.type)) {
      toast.error('Please upload a standard image file (PNG, JPG or SVG).')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setWmImagePreview(dataUrl)
      
      const img = new Image()
      img.onload = () => {
        setImageNaturalW(img.naturalWidth || 200)
        setImageNaturalH(img.naturalHeight || 100)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(f)
    setWmImageFile(f)
    e.target.value = ''
  }

  // ── Drag Handlers ──
  function onWatermarkPointerDown(e: React.PointerEvent) {
    e.stopPropagation(); e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    dragRef.current = { startX: wmConfig.x, startY: wmConfig.y, startMouseX: e.clientX, startMouseY: e.clientY }
  }

  function onPagePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const d = dragRef.current
    const dx = (e.clientX - d.startMouseX) / renderedW
    const dy = (e.clientY - d.startMouseY) / renderedH
    setWmConfig(p => ({
      ...p,
      x: Math.max(0, Math.min(1, d.startX + dx)),
      y: Math.max(0, Math.min(1, d.startY + dy))
    }))
  }

  function onPagePointerUp() { dragRef.current = null }

  // ── Generate & Download Signed PDF ──
  async function downloadWatermarked() {
    if (!pdfFile) { toast.error('Please upload a PDF first.'); return }
    if (wmConfig.type === 'image' && !wmImageFile) { toast.error('Please upload a watermark image.'); return }
    setIsGenerating(true)
    try {
      const buf = await pdfFile.arrayBuffer()
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any)
      const pages = doc.getPages()
      
      // Render text to crisp high-res PNG image so fonts are embedded beautifully
      let wmImgObj: any = null
      let wmPng: { dataUrl: string; width: number; height: number } | null = null
      
      if (wmConfig.type === 'text') {
        const font = WATERMARK_FONTS[wmConfig.fontIndex]
        wmPng = generateTextWatermarkPng(
          wmConfig.text || 'Watermark',
          font.css,
          wmConfig.fontSize,
          wmConfig.textColor
        )
        const b64 = wmPng.dataUrl.split(',')[1]
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        wmImgObj = await doc.embedPng(bytes)
      } else if (wmConfig.type === 'image' && wmImageFile) {
        const imgBuffer = await wmImageFile.arrayBuffer()
        wmImgObj = wmImageFile.type.includes('png')
          ? await doc.embedPng(imgBuffer)
          : await doc.embedJpg(imgBuffer)
      }

      if (!wmImgObj) {
        toast.error('Failed to prepare watermark image.')
        return
      }

      for (let i = 0; i < pages.length; i++) {
        if (applyTo === 'current' && i !== currentPage - 1) continue
        
        const page = pages[i]
        const { width: pw, height: ph } = page.getSize()

        let finalW = 0
        let finalH = 0

        if (wmConfig.type === 'text' && wmPng) {
          finalW = wmPng.width
          finalH = wmPng.height
        } else {
          const scale = wmConfig.scale
          finalW = imageNaturalW * scale
          finalH = imageNaturalH * scale
        }

        // Calculate PDF bottom-left coordinates centered at (x, y)
        const drawX = wmConfig.x * pw - finalW / 2
        const drawY = ph - (wmConfig.y * ph) - finalH / 2

        page.drawImage(wmImgObj, {
          x: drawX,
          y: drawY,
          width: finalW,
          height: finalH,
          rotate: degrees(-wmConfig.rotation),
          opacity: wmConfig.opacity,
        })
      }

      const outBytes = await doc.save({ useObjectStreams: true })
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pdfFile.name.replace(/\.pdf$/i, '')}-watermarked.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Watermarked PDF downloaded!')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate watermarked PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Calculate dynamic screen dimensions ──
  const screenScale = renderedW / pageNaturalW
  let wmScreenW = 0
  let wmScreenH = 0

  if (wmConfig.type === 'text') {
    // Approx dimensions of text box
    const testCanvas = document.createElement('canvas')
    const ctx = testCanvas.getContext('2d')!
    ctx.font = `bold ${wmConfig.fontSize}px ${WATERMARK_FONTS[wmConfig.fontIndex].css}`
    const metrics = ctx.measureText(wmConfig.text || 'Watermark')
    wmScreenW = (Math.max(20, metrics.width) + 32) * screenScale
    wmScreenH = (wmConfig.fontSize * 1.3 + 32) * screenScale
  } else {
    wmScreenW = (imageNaturalW * wmConfig.scale) * screenScale
    wmScreenH = (imageNaturalH * wmConfig.scale) * screenScale
  }

  const left = wmConfig.x * renderedW
  const top = wmConfig.y * renderedH

  // ─────────────────── UPLOAD SCREEN ───────────────────────────────────────────

  if (!pdfFile) {
    return (
      <div className="relative min-h-screen">
        <SEO title="Add Watermark to PDF — Premium Custom Watermarks" description="Stamp text or image watermarks onto PDF pages with custom colors, cursive styling and direct interactive drag-and-drop repositioning." canonical="/tool/watermark" />
        <Background />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
            <Type className="w-3.5 h-3.5" /> Add Watermark
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Add Custom Watermarks</h1>
          <p className="text-lg opacity-60 mb-10 max-w-lg mx-auto">Stamp customized text or logos onto your PDF pages. Drag and drop to position anywhere with high-quality cursive styles.</p>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-3xl p-14 transition-all cursor-pointer ${isDraggingFile ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface)]'}`}
            onDragOver={e => { e.preventDefault(); setIsDraggingFile(true) }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={onFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center hover:scale-110 transition-transform">
                <FileText className="w-10 h-10" />
              </div>
              <div>
                <p className="text-xl font-bold mb-1">Drop your PDF here</p>
                <p className="opacity-50 text-sm">or click to browse</p>
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-lg">
                <Upload className="w-4 h-4" /> Choose PDF
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} />

          <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-left">
            {([
              [Type, 'Text Watermark', 'Customize text, fonts, colors'],
              [ImageIcon, 'Image Watermark', 'Upload and scale transparent logos'],
              [Move, 'Interactive Drag', 'Position visually with 100% precision'],
            ] as const).map(([Icon, label, desc]) => (
              <div key={label} className="glass-panel rounded-2xl p-5">
                <Icon className="w-5 h-5 text-[var(--accent)] mb-3" />
                <p className="font-bold text-sm">{label}</p>
                <p className="opacity-50 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────── EDITOR SCREEN ───────────────────────────────────────────

  return (
    <div className="relative" style={{ minHeight: '100vh' }}>
      <SEO title="Add Watermark — Editor Workspace" description="Place custom watermarks interactively." canonical="/tool/watermark" />
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">

        {/* ── Top Controls Bar ── */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between border border-[var(--border)]">
          {/* Left: title + filename */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Type className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-black text-base leading-none block">Add Watermark</span>
              <span className="text-[10px] opacity-40 truncate block max-w-[200px]">{pdfFile.name}</span>
            </div>
          </div>
          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { setPdfFile(null); setPdfDoc(null); setRenderedPageUrl(null) }} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-all">
              <X className="w-3.5 h-3.5" /> New PDF
            </button>
            <button
              onClick={downloadWatermarked}
              disabled={isGenerating}
              className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-[var(--accent-hover)] hover:shadow-red-500/30 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isGenerating ? 'Generating…' : 'Download Watermarked PDF'}
            </button>
          </div>
        </div>

        {/* ── Main Content: Sidebar + Preview ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[284px_1fr] gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ── Left Sidebar ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-y-auto flex flex-col gap-3 p-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>

            {/* Watermark Type Tabs */}
            <div className="flex rounded-xl bg-[var(--surface)] p-1 gap-1 flex-shrink-0">
              {([['text', Type, 'Text'], ['image', ImageIcon, 'Image']] as const).map(([t, Icon, lbl]) => (
                <button key={t} onClick={() => setWmConfig(p => ({ ...p, type: t }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${wmConfig.type === t ? 'bg-[var(--accent)] text-white shadow' : 'hover:bg-[var(--surface-hover)]'}`}>
                  <Icon className="w-3.5 h-3.5" /> {lbl}
                </button>
              ))}
            </div>

            {/* ── Text Watermark Tab ── */}
            {wmConfig.type === 'text' && (
              <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2 border border-[var(--border)]">
                <p className="text-xs font-bold">Watermark Text</p>
                <input
                  type="text"
                  value={wmConfig.text}
                  onChange={e => setWmConfig(p => ({ ...p, text: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                  placeholder="e.g. DRAFT"
                />
                
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mt-2">Font Style</p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                  {WATERMARK_FONTS.map((f, i) => (
                    <button key={f.name} onClick={() => setWmConfig(p => ({ ...p, fontIndex: i }))}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-sm transition-all ${wmConfig.fontIndex === i ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--background)]'}`}
                      style={{ fontFamily: f.css }}>
                      {wmConfig.text || 'Watermark'}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mt-2">Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {WATERMARK_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setWmConfig(p => ({ ...p, textColor: c.hex }))}
                      className={`w-6 h-6 rounded-full border border-black/10 flex items-center justify-center transition-all hover:scale-110 ${wmConfig.textColor === c.hex ? 'ring-2 ring-[var(--accent)]' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {wmConfig.textColor === c.hex && <Check className="w-3.5 h-3.5 mix-blend-difference text-white" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] opacity-60 font-bold whitespace-nowrap">Text Size</span>
                  <input type="range" min={12} max={120} value={wmConfig.fontSize} onChange={e => setWmConfig(p => ({ ...p, fontSize: +e.target.value }))} className="flex-1 accent-[var(--accent)]" />
                  <span className="text-[10px] font-bold w-6 text-right">{wmConfig.fontSize}</span>
                </div>
              </div>
            )}

            {/* ── Image Watermark Tab ── */}
            {wmConfig.type === 'image' && (
              <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2 border border-[var(--border)]">
                <p className="text-xs font-bold">Watermark Image</p>
                {wmImagePreview ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:12px_12px]" style={{ minHeight: 64 }}>
                      <img src={wmImagePreview} alt="watermark logo" className="max-h-16 mx-auto object-contain block" />
                    </div>
                    <button onClick={() => { setWmImagePreview(null); setWmImageFile(null) }} className="w-full h-7 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Remove Image
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-lg border-2 border-dashed border-[var(--border)] p-6 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--background)] transition-all"
                    onClick={() => wmImageInputRef.current?.click()}>
                    <ImageIcon className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Click to upload logo</p>
                    <p className="text-[10px] opacity-50 mt-1">PNG · JPG · SVG</p>
                  </div>
                )}
                <input ref={wmImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleWmImageUpload} />

                {wmImagePreview && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] opacity-60 font-bold whitespace-nowrap">Scale</span>
                    <input type="range" min={0.1} max={2.0} step={0.05} value={wmConfig.scale} onChange={e => setWmConfig(p => ({ ...p, scale: +e.target.value }))} className="flex-1 accent-[var(--accent)]" />
                    <span className="text-[10px] font-bold w-10 text-right">{Math.round(wmConfig.scale * 100)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Opacity & Rotation Controls ── */}
            <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)] space-y-3">
              <div>
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-2">Opacity</p>
                <div className="flex items-center gap-2">
                  <input type="range" min={0.05} max={1.0} step={0.05} value={wmConfig.opacity} onChange={e => setWmConfig(p => ({ ...p, opacity: +e.target.value }))} className="flex-1 accent-[var(--accent)]" />
                  <span className="text-[10px] font-bold w-10 text-right">{Math.round(wmConfig.opacity * 100)}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-2">Rotation</p>
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                  <input type="range" min={-180} max={180} step={5} value={wmConfig.rotation} onChange={e => setWmConfig(p => ({ ...p, rotation: +e.target.value }))} className="flex-1 accent-[var(--accent)]" />
                  <span className="text-[10px] font-bold w-10 text-right">{wmConfig.rotation}°</span>
                </div>
              </div>
            </div>

            {/* ── Target Pages Selector ── */}
            <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)] space-y-2">
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Apply Watermark To</p>
              <div className="flex rounded-lg bg-[var(--background)] p-1 gap-1 border border-[var(--border)]">
                {([['all', 'All Pages'], ['current', 'Current Page']] as const).map(([opt, lbl]) => (
                  <button key={opt} onClick={() => setApplyTo(opt)}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${applyTo === opt ? 'bg-[var(--accent)] text-white shadow' : 'hover:bg-[var(--surface-hover)]'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Precise Coordinates Indicator ── */}
            <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
              <p className="text-[10px] font-bold opacity-45 uppercase tracking-widest flex items-center mb-2.5">
                <Move className="w-3 h-3 mr-1.5" /> Center Position
              </p>
              <div className="flex gap-2">
                <div className="flex-1 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold opacity-35">X Ratio</span>
                  <input type="number" step="0.01" value={+wmConfig.x.toFixed(2)} onChange={e => setWmConfig(p => ({ ...p, x: Math.max(0, Math.min(1, +e.target.value)) }))} className="w-full bg-[var(--background)] p-1.5 rounded text-xs border border-[var(--border)]" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold opacity-35">Y Ratio</span>
                  <input type="number" step="0.01" value={+wmConfig.y.toFixed(2)} onChange={e => setWmConfig(p => ({ ...p, y: Math.max(0, Math.min(1, +e.target.value)) }))} className="w-full bg-[var(--background)] p-1.5 rounded text-xs border border-[var(--border)]" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: PDF Preview Area ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden" style={{ minHeight: 500, maxHeight: 'calc(100vh - 200px)' }}>

            {/* Page Navigation + Zoom Bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                  className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold px-1 whitespace-nowrap">Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-all">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.25).toFixed(2)))}
                  className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] transition-all">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                  className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] transition-all">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setZoom(1)} className="h-7 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[10px] font-bold hover:bg-[var(--surface-hover)] transition-all">
                  Fit
                </button>
              </div>
              <span className="text-[10px] opacity-40 font-semibold hidden sm:block">
                Drag watermark text/logo directly on PDF to position
              </span>
            </div>

            {/* Scrollable PDF Area */}
            <div
              ref={previewScrollRef}
              className="flex-1 overflow-auto p-6 bg-[var(--surface)]/40"
            >
              <div className="flex justify-center items-start min-h-full">
                {isRendering ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                    <span className="text-xs font-bold opacity-50">Rendering page…</span>
                  </div>
                ) : renderedPageUrl ? (
                  <div
                    ref={pageContainerRef}
                    className="relative select-none flex-shrink-0 shadow-2xl rounded overflow-hidden"
                    style={{ width: renderedW, height: renderedH }}
                    onPointerMove={onPagePointerMove}
                    onPointerUp={onPagePointerUp}
                  >
                    <img
                      src={renderedPageUrl}
                      alt={`Page ${currentPage}`}
                      draggable={false}
                      style={{ display: 'block', width: renderedW, height: renderedH }}
                    />

                    {/* Draggable Watermark Overlay */}
                    {(wmConfig.type === 'text' || wmImagePreview) && (
                      <div
                        className="absolute select-none cursor-move active:cursor-grabbing border border-dashed border-[var(--accent)]/40 hover:border-[var(--accent)] p-4 flex items-center justify-center transition-shadow hover:shadow-lg"
                        style={{
                          left,
                          top,
                          width: wmScreenW,
                          height: wmScreenH,
                          transform: `translate(-50%, -50%) rotate(${wmConfig.rotation}deg)`,
                          transformOrigin: 'center',
                          opacity: wmConfig.opacity,
                          touchAction: 'none'
                        }}
                        onPointerDown={onWatermarkPointerDown}
                      >
                        {wmConfig.type === 'text' ? (
                          <span
                            style={{
                              fontFamily: WATERMARK_FONTS[wmConfig.fontIndex].css,
                              fontSize: wmConfig.fontSize * screenScale,
                              color: wmConfig.textColor,
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap',
                              userSelect: 'none',
                              pointerEvents: 'none'
                            }}
                          >
                            {wmConfig.text || 'Watermark'}
                          </span>
                        ) : (
                          <img
                            src={wmImagePreview || ''}
                            alt=""
                            draggable={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              userSelect: 'none',
                              pointerEvents: 'none'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center opacity-20 py-20">
                    <FileText className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom padding */}
        <div className="pb-4" />
      </div>
    </div>
  )
}
