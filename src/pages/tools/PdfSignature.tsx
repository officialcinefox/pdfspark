import React, { useRef, useEffect, useState, useCallback } from 'react'
import SignaturePad from 'signature_pad'
import { PDFDocument, rgb } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import toast from 'react-hot-toast'
import {
  Upload, PenTool, Type, ImageIcon, Trash2, RotateCcw,
  Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  X, Check, Move, Loader2, FileText, Minus, Plus, RotateCw
} from 'lucide-react'
import { SEO } from '../../components/SEO'
import { Background } from '../../components/Background'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

// ─── Types ────────────────────────────────────────────────────────────────────

type SignatureMethod = 'draw' | 'type' | 'upload'

interface PlacedSignature {
  id: string
  pageIndex: number
  dataUrl: string
  x: number       // as fraction of rendered page width (0–1)
  y: number       // as fraction of rendered page height (0–1)
  width: number   // fraction of page width
  height: number  // fraction of page height
  rotation: number
}

interface DragState {
  sigId: string
  startMouseX: number
  startMouseY: number
  startSigX: number
  startSigY: number
}

interface ResizeState {
  sigId: string
  handle: 'se' | 'sw' | 'ne' | 'nw'
  startMouseX: number
  startMouseY: number
  startW: number
  startH: number
  startX: number
  startY: number
}

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', css: "'Dancing Script', cursive" },
  { name: 'Pacifico', css: "'Pacifico', cursive" },
  { name: 'Great Vibes', css: "'Great Vibes', cursive" },
  { name: 'Satisfy', css: "'Satisfy', cursive" },
  { name: 'Sacramento', css: "'Sacramento', cursive" },
]

// ─── Google Font Loader ────────────────────────────────────────────────────────
function loadGoogleFonts() {
  const families = SIGNATURE_FONTS.map(f => f.name.replace(/ /g, '+')).join('|')
  if (!document.getElementById('sig-fonts')) {
    const link = document.createElement('link')
    link.id = 'sig-fonts'
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
    document.head.appendChild(link)
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PdfSignatureTool() {
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [renderedPageUrl, setRenderedPageUrl] = useState<string | null>(null)
  const [pageNaturalW, setPageNaturalW] = useState(0)
  const [pageNaturalH, setPageNaturalH] = useState(0)
  const [pageRenderedW, setPageRenderedW] = useState(0)
  const [pageRenderedH, setPageRenderedH] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // Signature creation state
  const [method, setMethod] = useState<SignatureMethod>('draw')
  const [sigPad, setSigPad] = useState<SignaturePad | null>(null)
  const [typedText, setTypedText] = useState('')
  const [selectedFont, setSelectedFont] = useState(0)
  const [fontSize, setFontSize] = useState(48)
  const [pendingSigUrl, setPendingSigUrl] = useState<string | null>(null)

  // Placed signatures
  const [signatures, setSignatures] = useState<PlacedSignature[]>([])
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<PlacedSignature[][]>([])

  // Drag/resize
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sigImgInputRef = useRef<HTMLInputElement>(null)
  const typeCanvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // ── Load fonts on mount ──
  useEffect(() => { loadGoogleFonts() }, [])

  // ── Setup SignaturePad when draw tab is active ──
  useEffect(() => {
    if (method !== 'draw' || !canvasRef.current) return
    const pad = new SignaturePad(canvasRef.current, {
      minWidth: 1.5,
      maxWidth: 3.5,
      penColor: '#1a1a2e',
    })
    setSigPad(pad)
    resizeDrawCanvas()
    return () => { pad.off(); setSigPad(null) }
  }, [method])

  function resizeDrawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')!
    ctx.scale(ratio, ratio)
  }

  // ── Render current PDF page ──
  useEffect(() => {
    if (!pdfDoc) return
    renderPage(pdfDoc, currentPage, zoom)
  }, [pdfDoc, currentPage, zoom])

  async function renderPage(doc: pdfjsLib.PDFDocumentProxy, pageNum: number, scale: number) {
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }
    setIsRendering(true)
    try {
      const page = await doc.getPage(pageNum)
      const vp = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(vp.width)
      canvas.height = Math.round(vp.height)
      const ctx = canvas.getContext('2d')!
      const task = page.render({ canvasContext: ctx, viewport: vp })
      renderTaskRef.current = task
      await task.promise
      const url = canvas.toDataURL('image/png')
      const baseVp = page.getViewport({ scale: 1 })
      setPageNaturalW(baseVp.width)
      setPageNaturalH(baseVp.height)
      setPageRenderedW(vp.width)
      setPageRenderedH(vp.height)
      setRenderedPageUrl(url)
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') console.error(e)
    } finally {
      setIsRendering(false)
    }
  }

  // ── File upload handlers ──
  async function handleFileSelect(file: File) {
    if (!file.type.includes('pdf')) {
      toast.error('Please upload a valid PDF file.')
      return
    }
    const buf = await file.arrayBuffer()
    try {
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      setPdfFile(file)
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setSignatures([])
      setSelectedSigId(null)
      setUndoStack([])
      toast.success(`PDF loaded — ${doc.numPages} page${doc.numPages > 1 ? 's' : ''}`)
    } catch {
      toast.error('Could not read this PDF. It may be corrupted or password-protected.')
    }
  }

  function onDropZone(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // ── Signature creation ──
  function captureDrawSignature() {
    if (!sigPad || sigPad.isEmpty()) {
      toast.error('Please draw your signature first.')
      return
    }
    setPendingSigUrl(sigPad.toDataURL('image/png'))
  }

  function clearDraw() { sigPad?.clear() }

  function captureTypedSignature() {
    if (!typedText.trim()) { toast.error('Please type your name first.'); return }
    const c = document.createElement('canvas')
    const fontStr = SIGNATURE_FONTS[selectedFont].css
    const size = fontSize
    c.width = 600; c.height = size * 2 + 20
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.font = `${size}px ${fontStr}`
    ctx.fillStyle = '#1a1a2e'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedText, 20, c.height / 2)
    // Crop to content
    const imgData = ctx.getImageData(0, 0, c.width, c.height)
    let minX = c.width, maxX = 0, minY = c.height, maxY = 0
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const a = imgData.data[(y * c.width + x) * 4 + 3]
        if (a > 10) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
      }
    }
    if (maxX <= minX) { toast.error('Could not render signature.'); return }
    const pad = 10
    const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2
    const c2 = document.createElement('canvas')
    c2.width = w; c2.height = h
    c2.getContext('2d')!.drawImage(c, minX - pad, minY - pad, w, h, 0, 0, w, h)
    setPendingSigUrl(c2.toDataURL('image/png'))
  }

  function handleSigImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a PNG or JPG image.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setPendingSigUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Place signature on page ──
  function placePendingSignature() {
    if (!pendingSigUrl || !pdfDoc) { toast.error('Please create a signature first.'); return }
    pushUndo()
    const newSig: PlacedSignature = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageIndex: currentPage - 1,
      dataUrl: pendingSigUrl,
      x: 0.3,
      y: 0.5,
      width: 0.25,
      height: 0.1,
      rotation: 0,
    }
    setSignatures(prev => [...prev, newSig])
    setSelectedSigId(newSig.id)
    toast.success('Signature placed! Drag to reposition.')
  }

  function pushUndo() {
    setUndoStack(prev => [...prev.slice(-19), [...signatures]])
  }

  function undo() {
    if (undoStack.length === 0) { toast('Nothing to undo.'); return }
    const prev = undoStack[undoStack.length - 1]
    setSignatures(prev)
    setUndoStack(s => s.slice(0, -1))
  }

  function deleteSelected() {
    if (!selectedSigId) { toast('No signature selected.'); return }
    pushUndo()
    setSignatures(prev => prev.filter(s => s.id !== selectedSigId))
    setSelectedSigId(null)
  }

  function clearAll() {
    if (signatures.length === 0) return
    pushUndo()
    setSignatures([])
    setSelectedSigId(null)
  }

  function updateSig(id: string, patch: Partial<PlacedSignature>) {
    setSignatures(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  // ── Drag signature ──
  function onSigMouseDown(e: React.MouseEvent, sig: PlacedSignature) {
    e.stopPropagation()
    e.preventDefault()
    setSelectedSigId(sig.id)
    dragRef.current = {
      sigId: sig.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startSigX: sig.x,
      startSigY: sig.y,
    }
  }

  // ── Resize handle ──
  function onResizeMouseDown(e: React.MouseEvent, sig: PlacedSignature, handle: ResizeState['handle']) {
    e.stopPropagation()
    e.preventDefault()
    resizeRef.current = {
      sigId: sig.id,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: sig.width,
      startH: sig.height,
      startX: sig.x,
      startY: sig.y,
    }
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const container = pageContainerRef.current
      if (!container) return
      const W = pageRenderedW || container.clientWidth
      const H = pageRenderedH || container.clientHeight

      if (dragRef.current) {
        const d = dragRef.current
        const dx = (e.clientX - d.startMouseX) / W
        const dy = (e.clientY - d.startMouseY) / H
        updateSig(d.sigId, { x: Math.max(0, Math.min(1, d.startSigX + dx)), y: Math.max(0, Math.min(1, d.startSigY + dy)) })
      }
      if (resizeRef.current) {
        const r = resizeRef.current
        const dx = (e.clientX - r.startMouseX) / W
        const dy = (e.clientY - r.startMouseY) / H
        const minW = 0.04, minH = 0.02
        if (r.handle === 'se') {
          updateSig(r.sigId, { width: Math.max(minW, r.startW + dx), height: Math.max(minH, r.startH + dy) })
        } else if (r.handle === 'sw') {
          const newW = Math.max(minW, r.startW - dx)
          updateSig(r.sigId, { width: newW, x: r.startX + r.startW - newW, height: Math.max(minH, r.startH + dy) })
        } else if (r.handle === 'ne') {
          const newH = Math.max(minH, r.startH - dy)
          updateSig(r.sigId, { width: Math.max(minW, r.startW + dx), height: newH, y: r.startY + r.startH - newH })
        } else if (r.handle === 'nw') {
          const newW = Math.max(minW, r.startW - dx)
          const newH = Math.max(minH, r.startH - dy)
          updateSig(r.sigId, { width: newW, height: newH, x: r.startX + r.startW - newW, y: r.startY + r.startH - newH })
        }
      }
    }
    function onMouseUp() { dragRef.current = null; resizeRef.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [pageRenderedW, pageRenderedH])

  // ── Touch support ──
  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      const container = pageContainerRef.current
      if (!container || !dragRef.current) return
      const touch = e.touches[0]
      const W = pageRenderedW || container.clientWidth
      const H = pageRenderedH || container.clientHeight
      const d = dragRef.current
      const dx = (touch.clientX - d.startMouseX) / W
      const dy = (touch.clientY - d.startMouseY) / H
      updateSig(d.sigId, { x: Math.max(0, Math.min(1, d.startSigX + dx)), y: Math.max(0, Math.min(1, d.startSigY + dy)) })
    }
    function onTouchEnd() { dragRef.current = null }
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => { window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd) }
  }, [pageRenderedW, pageRenderedH])

  function onSigTouchStart(e: React.TouchEvent, sig: PlacedSignature) {
    const touch = e.touches[0]
    setSelectedSigId(sig.id)
    dragRef.current = {
      sigId: sig.id,
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      startSigX: sig.x,
      startSigY: sig.y,
    }
  }

  // ── Generate final PDF ──
  async function generateSignedPdf() {
    if (!pdfFile || signatures.length === 0) {
      toast.error('Please add at least one signature before downloading.')
      return
    }
    setIsGenerating(true)
    try {
      const buf = await pdfFile.arrayBuffer()
      const pdfLibDoc = await PDFDocument.load(buf, { ignoreEncryption: true } as any)
      const pages = pdfLibDoc.getPages()

      for (const sig of signatures) {
        const page = pages[sig.pageIndex]
        if (!page) continue
        const { width: pw, height: ph } = page.getSize()

        // Decode dataUrl → bytes
        const b64 = sig.dataUrl.split(',')[1]
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const isJpeg = sig.dataUrl.startsWith('data:image/jpeg')
        const img = isJpeg ? await pdfLibDoc.embedJpg(bytes) : await pdfLibDoc.embedPng(bytes)

        // Convert fractional positions to PDF points
        // Note: PDF y=0 is bottom, our y is from top
        const sigW = sig.width * pw
        const sigH = sig.height * ph
        const sigX = sig.x * pw
        const sigY = ph - (sig.y * ph) - sigH

        page.drawImage(img, {
          x: sigX,
          y: sigY,
          width: sigW,
          height: sigH,
          rotate: { type: 'degrees' as const, angle: -sig.rotation },
          opacity: 1,
        })
      }

      const outBytes = await pdfLibDoc.save({ useObjectStreams: true })
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const base = pdfFile.name.replace(/\.pdf$/i, '')
      a.href = url
      a.download = `${base}-signed.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Signed PDF downloaded!')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Page sigs filtered ──
  const pageSigs = signatures.filter(s => s.pageIndex === currentPage - 1)

  // ─────────────────────────── RENDER ─────────────────────────────────────────

  if (!pdfFile) {
    return (
      <div className="relative min-h-screen">
        <SEO title="PDF Signature Tool" description="Sign PDFs professionally with draw, type, or upload signature methods. 100% browser-based, no upload required." canonical="/tool/digital-signature" />
        <Background />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
            <PenTool className="w-3.5 h-3.5" /> PDF Signature Tool
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Sign PDFs Professionally</h1>
          <p className="text-lg opacity-60 mb-12 max-w-xl mx-auto">Draw, type, or upload your signature and place it anywhere on any PDF page. 100% private — runs in your browser.</p>

          <div
            className={`border-2 border-dashed rounded-3xl p-14 transition-all cursor-pointer group ${isDraggingFile ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface)]'}`}
            onDragOver={e => { e.preventDefault(); setIsDraggingFile(true) }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={onDropZone}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-10 h-10" />
              </div>
              <div>
                <p className="text-xl font-bold mb-1">Drop your PDF here</p>
                <p className="opacity-50 text-sm">or click to browse files</p>
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all">
                <Upload className="w-4 h-4" /> Choose PDF File
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = '' }} />

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { icon: PenTool, label: 'Draw Signature', desc: 'Mouse, touch or stylus' },
              { icon: Type, label: 'Type Signature', desc: 'Multiple elegant fonts' },
              { icon: ImageIcon, label: 'Upload Image', desc: 'PNG with transparency' },
            ].map(f => (
              <div key={f.label} className="glass-panel rounded-2xl p-5 text-left">
                <f.icon className="w-5 h-5 text-[var(--accent)] mb-3" />
                <p className="font-bold">{f.label}</p>
                <p className="opacity-50 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Editor UI ──
  return (
    <div className="relative min-h-screen">
      <SEO title="PDF Signature Tool" description="Sign PDFs professionally. 100% browser-based." canonical="/tool/digital-signature" />
      <Background />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><PenTool className="w-6 h-6 text-[var(--accent)]" /> PDF Signature</h1>
            <p className="text-sm opacity-50 mt-0.5 truncate max-w-xs">{pdfFile.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={undo} disabled={undoStack.length === 0} className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-all flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Undo
            </button>
            <button onClick={deleteSelected} disabled={!selectedSigId} className="h-9 px-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-40 transition-all flex items-center gap-1.5">
              <Minus className="w-4 h-4" /> Remove
            </button>
            <button onClick={clearAll} disabled={signatures.length === 0} className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-all flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
            <button onClick={() => { setPdfFile(null); setPdfDoc(null); setSignatures([]); setUndoStack([]) }} className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold hover:bg-[var(--surface-hover)] transition-all flex items-center gap-1.5">
              <X className="w-4 h-4" /> New PDF
            </button>
            <button
              onClick={generateSignedPdf}
              disabled={isGenerating || signatures.length === 0}
              className="h-9 px-5 rounded-xl bg-[var(--accent)] text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-[var(--accent-hover)] hover:shadow-red-500/30 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGenerating ? 'Generating…' : 'Download Signed PDF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">

          {/* ── Left Panel: Signature Creator ── */}
          <div className="space-y-4">

            {/* Method Tabs */}
            <div className="glass-panel rounded-2xl p-1.5 flex gap-1">
              {([['draw', PenTool, 'Draw'], ['type', Type, 'Type'], ['upload', ImageIcon, 'Upload']] as const).map(([m, Icon, label]) => (
                <button key={m} onClick={() => { setMethod(m); setPendingSigUrl(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${method === m ? 'bg-[var(--accent)] text-white shadow' : 'hover:bg-[var(--surface-hover)]'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {/* Draw Panel */}
            {method === 'draw' && (
              <div className="glass-panel rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Draw your signature</p>
                  <button onClick={clearDraw} className="text-xs text-[var(--accent)] font-semibold hover:underline">Clear</button>
                </div>
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white">
                  <canvas ref={canvasRef} className="w-full" style={{ height: 160, touchAction: 'none', cursor: 'crosshair' }} />
                </div>
                <p className="text-xs opacity-50">Use mouse or touch to draw your signature</p>
                <button onClick={captureDrawSignature} className="w-full h-10 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Use This Signature
                </button>
              </div>
            )}

            {/* Type Panel */}
            {method === 'type' && (
              <div className="glass-panel rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold">Type your name</p>
                <input
                  type="text"
                  placeholder="Your name…"
                  value={typedText}
                  onChange={e => setTypedText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none text-sm"
                />
                <div>
                  <p className="text-xs font-semibold mb-2 opacity-60">Choose font</p>
                  <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                    {SIGNATURE_FONTS.map((f, i) => (
                      <button key={f.name} onClick={() => setSelectedFont(i)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xl transition-all ${selectedFont === i ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface)]'}`}
                        style={{ fontFamily: f.css }}>
                        {typedText || 'Your Name'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold opacity-60">Size</span>
                  <input type="range" min={28} max={80} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="flex-1 accent-[var(--accent)]" />
                  <span className="text-xs font-bold w-8">{fontSize}</span>
                </div>
                <button onClick={captureTypedSignature} className="w-full h-10 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Use This Signature
                </button>
              </div>
            )}

            {/* Upload Panel */}
            {method === 'upload' && (
              <div className="glass-panel rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold">Upload signature image</p>
                <div
                  className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--surface)] transition-all"
                  onClick={() => sigImgInputRef.current?.click()}
                >
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Click to upload</p>
                  <p className="text-xs opacity-50 mt-1">PNG, JPG, JPEG • PNG with transparency recommended</p>
                </div>
                <input ref={sigImgInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleSigImageUpload} />
              </div>
            )}

            {/* Pending Signature Preview */}
            {pendingSigUrl && (
              <div className="glass-panel rounded-2xl p-4 space-y-3 border-2 border-[var(--accent)]/30">
                <p className="text-sm font-bold text-[var(--accent)]">Signature Preview</p>
                <div className="rounded-xl bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:16px_16px] overflow-hidden border border-[var(--border)]">
                  <img src={pendingSigUrl} alt="Signature preview" className="max-h-24 mx-auto object-contain" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPendingSigUrl(null)} className="flex-1 h-9 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-hover)] transition-colors">
                    Cancel
                  </button>
                  <button onClick={placePendingSignature} className="flex-1 h-9 rounded-xl bg-[var(--accent)] text-white text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Place on PDF
                  </button>
                </div>
              </div>
            )}

            {/* Placed signatures list */}
            {signatures.length > 0 && (
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider opacity-50 mb-3">Placed Signatures ({signatures.length})</p>
                <div className="space-y-2">
                  {signatures.map(sig => (
                    <div key={sig.id} onClick={() => { setCurrentPage(sig.pageIndex + 1); setSelectedSigId(sig.id) }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${selectedSigId === sig.id ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/30' : 'hover:bg-[var(--surface-hover)]'}`}>
                      <div className="w-12 h-8 rounded-lg overflow-hidden bg-white border border-[var(--border)] flex items-center justify-center">
                        <img src={sig.dataUrl} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">Page {sig.pageIndex + 1}</p>
                        <p className="text-[10px] opacity-50">Tap to select</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); pushUndo(); setSignatures(p => p.filter(s => s.id !== sig.id)); if (selectedSigId === sig.id) setSelectedSigId(null) }} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rotation control for selected sig */}
            {selectedSigId && (() => {
              const sig = signatures.find(s => s.id === selectedSigId)
              if (!sig) return null
              return (
                <div className="glass-panel rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-50 mb-3">Selected Signature</p>
                  <div className="flex items-center gap-3">
                    <RotateCw className="w-4 h-4 opacity-50" />
                    <span className="text-xs font-semibold opacity-60">Rotation</span>
                    <input type="range" min={-180} max={180} value={sig.rotation} onChange={e => updateSig(sig.id, { rotation: +e.target.value })} className="flex-1 accent-[var(--accent)]" />
                    <span className="text-xs font-bold w-10 text-right">{sig.rotation}°</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── Right Panel: PDF Preview ── */}
          <div className="space-y-3">
            {/* Page nav + zoom */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold px-3">Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.2).toFixed(1)))} className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] transition-all">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold w-14 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, +(z + 0.2).toFixed(1)))} className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-hover)] transition-all">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(1)} className="h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold hover:bg-[var(--surface-hover)] transition-all">Reset</button>
              </div>
            </div>

            {/* Page canvas area */}
            <div className="glass-panel rounded-2xl overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <div className="p-4 flex justify-center">
                {isRendering ? (
                  <div className="flex items-center justify-center" style={{ width: pageRenderedW || 600, height: pageRenderedH || 400 }}>
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                  </div>
                ) : renderedPageUrl ? (
                  <div
                    ref={pageContainerRef}
                    className="relative select-none"
                    style={{ width: pageRenderedW, height: pageRenderedH }}
                    onClick={() => setSelectedSigId(null)}
                  >
                    {/* Rendered PDF page */}
                    <img src={renderedPageUrl} alt={`Page ${currentPage}`} className="block" style={{ width: pageRenderedW, height: pageRenderedH }} draggable={false} />

                    {/* Placed signatures overlay */}
                    {pageSigs.map(sig => {
                      const isSelected = sig.id === selectedSigId
                      const left = sig.x * pageRenderedW
                      const top = sig.y * pageRenderedH
                      const w = sig.width * pageRenderedW
                      const h = sig.height * pageRenderedH

                      return (
                        <div
                          key={sig.id}
                          className={`absolute ${isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-1' : 'ring-1 ring-blue-400/40'}`}
                          style={{
                            left, top, width: w, height: h,
                            transform: `rotate(${sig.rotation}deg)`,
                            transformOrigin: 'center center',
                            cursor: 'move',
                            touchAction: 'none',
                          }}
                          onMouseDown={e => onSigMouseDown(e, sig)}
                          onTouchStart={e => onSigTouchStart(e, sig)}
                          onClick={e => { e.stopPropagation(); setSelectedSigId(sig.id) }}
                        >
                          <img src={sig.dataUrl} alt="" className="w-full h-full object-contain" draggable={false} />

                          {/* Resize handles (only when selected) */}
                          {isSelected && (['nw', 'ne', 'sw', 'se'] as const).map(handle => (
                            <div
                              key={handle}
                              className="absolute w-3.5 h-3.5 bg-white border-2 border-[var(--accent)] rounded-sm shadow"
                              style={{
                                top: handle.includes('n') ? -7 : undefined,
                                bottom: handle.includes('s') ? -7 : undefined,
                                left: handle.includes('w') ? -7 : undefined,
                                right: handle.includes('e') ? -7 : undefined,
                                cursor: `${handle}-resize`,
                              }}
                              onMouseDown={e => onResizeMouseDown(e, sig, handle)}
                            />
                          ))}

                          {/* Delete button on selected */}
                          {isSelected && (
                            <button
                              className="absolute -top-5 -right-5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                              onClick={e => { e.stopPropagation(); pushUndo(); setSignatures(p => p.filter(s => s.id !== sig.id)); setSelectedSigId(null) }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-20 opacity-40">
                    <FileText className="w-12 h-12 mb-3" />
                    <p className="font-bold">No page rendered</p>
                  </div>
                )}
              </div>
            </div>

            {signatures.length > 0 && (
              <p className="text-xs text-center opacity-50">
                {pageSigs.length} signature{pageSigs.length !== 1 ? 's' : ''} on this page · {signatures.length} total
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
