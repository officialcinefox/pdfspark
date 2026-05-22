import React, { useRef, useEffect, useState } from 'react'
import SignaturePad from 'signature_pad'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import toast from 'react-hot-toast'
import {
  Upload, PenTool, Type, ImageIcon, Trash2, RotateCcw,
  Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  X, Check, Loader2, FileText, Plus, RotateCw, Minus
} from 'lucide-react'
import { SEO } from '../../components/SEO'
import { Background } from '../../components/Background'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

// ─── Types ───────────────────────────────────────────────────────────────────

type SignatureMethod = 'draw' | 'type' | 'upload'

interface PlacedSignature {
  id: string
  pageIndex: number
  dataUrl: string
  x: number       // fraction of PDF page width (0–1)
  y: number       // fraction of PDF page height (0–1)
  width: number   // fraction of PDF page width
  height: number  // fraction of PDF page height
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

function loadGoogleFonts() {
  if (!document.getElementById('sig-fonts')) {
    const families = SIGNATURE_FONTS.map(f => f.name.replace(/ /g, '+')).join('|')
    const link = document.createElement('link')
    link.id = 'sig-fonts'
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
    document.head.appendChild(link)
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PdfSignatureTool() {
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  // Natural page dimensions (PDF units at scale 1)
  const [pageNaturalW, setPageNaturalW] = useState(595)
  // Rendered image as data-url
  const [renderedPageUrl, setRenderedPageUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // Container width for fit-to-width rendering
  const [containerW, setContainerW] = useState(0)

  // Signature creation
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

  // Drag / resize
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  // Rendered page dimensions in px
  const [renderedW, setRenderedW] = useState(0)
  const [renderedH, setRenderedH] = useState(0)

  // Refs
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)   // scrollable PDF area
  const pageContainerRef = useRef<HTMLDivElement>(null)  // exact page div for drag calc
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sigImgInputRef = useRef<HTMLInputElement>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // ── Mount ──
  useEffect(() => { loadGoogleFonts() }, [])

  // ── ResizeObserver: track available preview width ──
  useEffect(() => {
    const el = previewScrollRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      // subtract 48px padding (p-6 = 24px each side)
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
      const fitScale = Math.min(availableW, 720) / naturalVp.width   // scale that fits container, capped at 720px for natural elegant sizing
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
      setRenderedW(Math.round(viewport.width))
      setRenderedH(Math.round(viewport.height))
      setRenderedPageUrl(canvas.toDataURL('image/png'))
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') console.error(e)
    } finally {
      setIsRendering(false)
    }
  }

  // ── SignaturePad setup ──
  useEffect(() => {
    if (method !== 'draw' || !drawCanvasRef.current) return
    const canvas = drawCanvasRef.current
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')!
    ctx.scale(ratio, ratio)

    const pad = new SignaturePad(canvas, { minWidth: 1.5, maxWidth: 3.5, penColor: '#1a1a2e' })
    setSigPad(pad)
    return () => { pad.off(); setSigPad(null) }
  }, [method])

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
      setSignatures([])
      setSelectedSigId(null)
      setUndoStack([])
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

  // ── Signature creation helpers ──
  function captureDrawSig() {
    if (!sigPad || sigPad.isEmpty()) { toast.error('Please draw your signature first.'); return }
    setPendingSigUrl(sigPad.toDataURL('image/png'))
  }

  function captureTypedSig() {
    if (!typedText.trim()) { toast.error('Please type your name.'); return }
    const c = document.createElement('canvas')
    c.width = 700; c.height = fontSize * 2 + 24
    const ctx = c.getContext('2d')!
    ctx.font = `${fontSize}px ${SIGNATURE_FONTS[selectedFont].css}`
    ctx.fillStyle = '#1a1a2e'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedText, 16, c.height / 2)
    // Crop to content
    const img = ctx.getImageData(0, 0, c.width, c.height)
    let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (img.data[(y * c.width + x) * 4 + 3] > 10) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x)
          y0 = Math.min(y0, y); y1 = Math.max(y1, y)
        }
    if (x1 <= x0) { toast.error('Could not render text.'); return }
    const pad = 10, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2
    const c2 = document.createElement('canvas')
    c2.width = w; c2.height = h
    c2.getContext('2d')!.drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, w, h)
    setPendingSigUrl(c2.toDataURL('image/png'))
  }

  function handleSigUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(f.type)) { toast.error('PNG or JPG only.'); return }
    const reader = new FileReader()
    reader.onload = ev => setPendingSigUrl(ev.target?.result as string)
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  // ── Place signature ──
  function placeSig() {
    if (!pendingSigUrl || !pdfDoc) { toast.error('Create a signature first.'); return }
    pushUndo()
    const sig: PlacedSignature = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageIndex: currentPage - 1,
      dataUrl: pendingSigUrl,
      x: 0.25, y: 0.45, width: 0.22, height: 0.08, rotation: 0,
    }
    setSignatures(p => [...p, sig])
    setSelectedSigId(sig.id)
    toast.success('Signature placed — drag to reposition.')
  }

  // ── Undo ──
  function pushUndo() { setUndoStack(p => [...p.slice(-19), [...signatures]]) }
  function undo() {
    if (!undoStack.length) { toast('Nothing to undo.'); return }
    setSignatures(undoStack[undoStack.length - 1])
    setUndoStack(p => p.slice(0, -1))
  }
  function deleteSelected() {
    if (!selectedSigId) { toast('No signature selected.'); return }
    pushUndo(); setSignatures(p => p.filter(s => s.id !== selectedSigId)); setSelectedSigId(null)
  }
  function clearAll() {
    if (!signatures.length) return
    pushUndo(); setSignatures([]); setSelectedSigId(null)
  }
  function updateSig(id: string, patch: Partial<PlacedSignature>) {
    setSignatures(p => p.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  // ── Drag ──
  function onSigPointerDown(e: React.PointerEvent, sig: PlacedSignature) {
    e.stopPropagation(); e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedSigId(sig.id)
    dragRef.current = { sigId: sig.id, startMouseX: e.clientX, startMouseY: e.clientY, startSigX: sig.x, startSigY: sig.y }
  }
  function onPagePointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const d = dragRef.current
      const dx = (e.clientX - d.startMouseX) / renderedW
      const dy = (e.clientY - d.startMouseY) / renderedH
      updateSig(d.sigId, { x: Math.max(0, Math.min(0.98, d.startSigX + dx)), y: Math.max(0, Math.min(0.98, d.startSigY + dy)) })
    }
    if (resizeRef.current) {
      const r = resizeRef.current
      const dx = (e.clientX - r.startMouseX) / renderedW
      const dy = (e.clientY - r.startMouseY) / renderedH
      const minW = 0.04, minH = 0.02
      if (r.handle === 'se') updateSig(r.sigId, { width: Math.max(minW, r.startW + dx), height: Math.max(minH, r.startH + dy) })
      else if (r.handle === 'sw') { const nW = Math.max(minW, r.startW - dx); updateSig(r.sigId, { width: nW, x: r.startX + r.startW - nW, height: Math.max(minH, r.startH + dy) }) }
      else if (r.handle === 'ne') { const nH = Math.max(minH, r.startH - dy); updateSig(r.sigId, { width: Math.max(minW, r.startW + dx), height: nH, y: r.startY + r.startH - nH }) }
      else if (r.handle === 'nw') { const nW = Math.max(minW, r.startW - dx); const nH = Math.max(minH, r.startH - dy); updateSig(r.sigId, { width: nW, height: nH, x: r.startX + r.startW - nW, y: r.startY + r.startH - nH }) }
    }
  }
  function onPagePointerUp() { dragRef.current = null; resizeRef.current = null }

  function onResizePointerDown(e: React.PointerEvent, sig: PlacedSignature, handle: ResizeState['handle']) {
    e.stopPropagation(); e.preventDefault()
    resizeRef.current = { sigId: sig.id, handle, startMouseX: e.clientX, startMouseY: e.clientY, startW: sig.width, startH: sig.height, startX: sig.x, startY: sig.y }
  }

  // ── Generate PDF ──
  async function downloadSigned() {
    if (!pdfFile || !signatures.length) { toast.error('Add at least one signature first.'); return }
    setIsGenerating(true)
    try {
      const buf = await pdfFile.arrayBuffer()
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any)
      const pages = doc.getPages()
      for (const sig of signatures) {
        const page = pages[sig.pageIndex]
        if (!page) continue
        const { width: pw, height: ph } = page.getSize()
        const b64 = sig.dataUrl.split(',')[1]
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const img = sig.dataUrl.startsWith('data:image/jpeg')
          ? await doc.embedJpg(bytes)
          : await doc.embedPng(bytes)
        const sigW = sig.width * pw
        const sigH = sig.height * ph
        page.drawImage(img, {
          x: sig.x * pw,
          y: ph - sig.y * ph - sigH,
          width: sigW,
          height: sigH,
          rotate: degrees(-sig.rotation),
          opacity: 1,
        })
      }
      const outBytes = await doc.save({ useObjectStreams: true })
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pdfFile.name.replace(/\.pdf$/i, '')}-signed.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Signed PDF downloaded!')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  const pageSigs = signatures.filter(s => s.pageIndex === currentPage - 1)
  const selectedSig = signatures.find(s => s.id === selectedSigId) ?? null

  // ─────────────────── UPLOAD SCREEN ───────────────────────────────────────────

  if (!pdfFile) {
    return (
      <div className="relative min-h-screen">
        <SEO title="PDF Signature Tool — Sign PDFs Free" description="Draw, type, or upload your signature and place it anywhere on a PDF. 100% browser-based." canonical="/tool/digital-signature" />
        <Background />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
            <PenTool className="w-3.5 h-3.5" /> PDF Signature
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Sign PDFs Professionally</h1>
          <p className="text-lg opacity-60 mb-10 max-w-lg mx-auto">Draw, type, or upload your signature and place it anywhere on any PDF page. Completely private — runs in your browser.</p>

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
              [PenTool, 'Draw Signature', 'Mouse, touch or stylus'],
              [Type, 'Type Signature', '5 elegant cursive fonts'],
              [ImageIcon, 'Upload Image', 'PNG with transparency'],
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
      <SEO title="PDF Signature Tool" description="Sign PDFs professionally. 100% browser-based." canonical="/tool/digital-signature" />
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">

        {/* ── Top Controls Bar ── */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between border border-[var(--border)]">
          {/* Left: title + filename */}
          <div className="flex items-center gap-2.5 min-w-0">
            <PenTool className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-black text-base leading-none block">PDF Signature</span>
              <span className="text-[10px] opacity-40 truncate block max-w-[200px]">{pdfFile.name}</span>
            </div>
          </div>
          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={undo} disabled={!undoStack.length} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-40 flex items-center gap-1.5 transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Undo
            </button>
            <button onClick={deleteSelected} disabled={!selectedSigId} className="h-8 px-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-40 flex items-center gap-1.5 transition-all">
              <Minus className="w-3.5 h-3.5" /> Remove
            </button>
            <button onClick={clearAll} disabled={!signatures.length} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-40 flex items-center gap-1.5 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
            <button onClick={() => { setPdfFile(null); setPdfDoc(null); setSignatures([]); setUndoStack([]); setRenderedPageUrl(null) }} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-all">
              <X className="w-3.5 h-3.5" /> New PDF
            </button>
            <button
              onClick={downloadSigned}
              disabled={isGenerating || !signatures.length}
              className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-[var(--accent-hover)] hover:shadow-red-500/30 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isGenerating ? 'Generating…' : 'Download Signed PDF'}
            </button>
          </div>
        </div>

        {/* ── Main Content: Sidebar + Preview ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[264px_1fr] gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ── Left Sidebar ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-y-auto flex flex-col gap-3 p-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>

            {/* Method Tabs */}
            <div className="flex rounded-xl bg-[var(--surface)] p-1 gap-1 flex-shrink-0">
              {([['draw', PenTool, 'Draw'], ['type', Type, 'Type'], ['upload', ImageIcon, 'Upload']] as const).map(([m, Icon, lbl]) => (
                <button key={m} onClick={() => { setMethod(m); setPendingSigUrl(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${method === m ? 'bg-[var(--accent)] text-white shadow' : 'hover:bg-[var(--surface-hover)]'}`}>
                  <Icon className="w-3.5 h-3.5" /> {lbl}
                </button>
              ))}
            </div>

            {/* ── Draw Panel ── */}
            {method === 'draw' && (
              <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2 border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">Draw your signature</p>
                  <button onClick={() => sigPad?.clear()} className="text-[10px] text-[var(--accent)] font-bold hover:underline">Clear</button>
                </div>
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white" style={{ height: 130 }}>
                  <canvas ref={drawCanvasRef} className="w-full h-full" style={{ touchAction: 'none', cursor: 'crosshair', display: 'block' }} />
                </div>
                <p className="text-[10px] opacity-50">Use mouse or touch to sign</p>
                <button onClick={captureDrawSig} className="w-full h-8 rounded-lg bg-[var(--accent)] text-white font-bold text-xs hover:bg-[var(--accent-hover)] flex items-center justify-center gap-1.5 transition-colors">
                  <Check className="w-3.5 h-3.5" /> Use This Signature
                </button>
              </div>
            )}

            {/* ── Type Panel ── */}
            {method === 'type' && (
              <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2 border border-[var(--border)]">
                <p className="text-xs font-bold">Type your name</p>
                <input
                  type="text" placeholder="Your name…" value={typedText}
                  onChange={e => setTypedText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                />
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Font</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {SIGNATURE_FONTS.map((f, i) => (
                    <button key={f.name} onClick={() => setSelectedFont(i)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-lg transition-all ${selectedFont === i ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--background)]'}`}
                      style={{ fontFamily: f.css }}>
                      {typedText || 'Your Name'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-60 font-bold whitespace-nowrap">Size</span>
                  <input type="range" min={24} max={80} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="flex-1 accent-[var(--accent)]" />
                  <span className="text-[10px] font-bold w-6">{fontSize}</span>
                </div>
                <button onClick={captureTypedSig} className="w-full h-8 rounded-lg bg-[var(--accent)] text-white font-bold text-xs hover:bg-[var(--accent-hover)] flex items-center justify-center gap-1.5 transition-colors">
                  <Check className="w-3.5 h-3.5" /> Use This Signature
                </button>
              </div>
            )}

            {/* ── Upload Panel ── */}
            {method === 'upload' && (
              <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2 border border-[var(--border)]">
                <p className="text-xs font-bold">Upload signature image</p>
                <div
                  className="rounded-lg border-2 border-dashed border-[var(--border)] p-6 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--background)] transition-all"
                  onClick={() => sigImgInputRef.current?.click()}>
                  <ImageIcon className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Click to upload</p>
                  <p className="text-[10px] opacity-50 mt-1">PNG (transparent) · JPG</p>
                </div>
                <input ref={sigImgInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleSigUpload} />
              </div>
            )}

            {/* ── Pending Sig Preview ── */}
            {pendingSigUrl && (
              <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2 border-2 border-[var(--accent)]/40">
                <p className="text-xs font-bold text-[var(--accent)]">Signature Preview</p>
                <div className="rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 14px 14px', minHeight: 52 }}>
                  <img src={pendingSigUrl} alt="sig" className="max-h-16 mx-auto object-contain block" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPendingSigUrl(null)} className="flex-1 h-8 rounded-lg border border-[var(--border)] text-xs font-semibold hover:bg-[var(--surface-hover)] transition-colors">Cancel</button>
                  <button onClick={placeSig} className="flex-1 h-8 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] flex items-center justify-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Place on PDF
                  </button>
                </div>
              </div>
            )}

            {/* ── Rotation for selected ── */}
            {selectedSig && (
              <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-2">Rotate Signature</p>
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                  <input type="range" min={-180} max={180} value={selectedSig.rotation} onChange={e => updateSig(selectedSig.id, { rotation: +e.target.value })} className="flex-1 accent-[var(--accent)]" />
                  <span className="text-[10px] font-bold w-10 text-right">{selectedSig.rotation}°</span>
                </div>
              </div>
            )}

            {/* ── Signatures list ── */}
            {signatures.length > 0 && (
              <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-2">Signatures ({signatures.length})</p>
                <div className="space-y-1.5">
                  {signatures.map(sig => (
                    <div
                      key={sig.id}
                      onClick={() => { setCurrentPage(sig.pageIndex + 1); setSelectedSigId(sig.id) }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${selectedSigId === sig.id ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/30' : 'hover:bg-[var(--background)]'}`}>
                      <div className="w-10 h-7 rounded overflow-hidden bg-white border border-[var(--border)] flex-shrink-0 flex items-center justify-center">
                        <img src={sig.dataUrl} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                      <span className="flex-1 text-[10px] font-bold">Page {sig.pageIndex + 1}</span>
                      <button onClick={e => { e.stopPropagation(); pushUndo(); setSignatures(p => p.filter(s => s.id !== sig.id)); if (selectedSigId === sig.id) setSelectedSigId(null) }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: PDF Preview ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden" style={{ minHeight: 500, maxHeight: 'calc(100vh - 200px)' }}>

            {/* Page nav + zoom toolbar */}
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
              {signatures.length > 0 && (
                <span className="text-[10px] opacity-40 font-semibold hidden sm:block">
                  {pageSigs.length} sig{pageSigs.length !== 1 ? 's' : ''} on page · {signatures.length} total
                </span>
              )}
            </div>

            {/* Scrollable PDF area */}
            <div
              ref={previewScrollRef}
              className="flex-1 overflow-auto p-6 bg-[var(--surface)]/40"
              onClick={() => setSelectedSigId(null)}
            >
              <div className="flex justify-center items-start min-h-full">
                {isRendering ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                    <span className="text-xs font-bold opacity-50">Rendering…</span>
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

                    {pageSigs.map(sig => {
                      const isSel = sig.id === selectedSigId
                      const left = sig.x * renderedW
                      const top = sig.y * renderedH
                      const w = sig.width * renderedW
                      const h = sig.height * renderedH
                      return (
                        <div
                          key={sig.id}
                          className={`absolute ${isSel ? 'ring-2 ring-[var(--accent)]' : 'ring-1 ring-blue-400/50'}`}
                          style={{ left, top, width: w, height: h, transform: `rotate(${sig.rotation}deg)`, transformOrigin: 'center', cursor: 'move', touchAction: 'none' }}
                          onPointerDown={e => onSigPointerDown(e, sig)}
                          onClick={e => { e.stopPropagation(); setSelectedSigId(sig.id) }}
                        >
                          <img src={sig.dataUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                          {isSel && (['nw', 'ne', 'sw', 'se'] as const).map(h => (
                            <div
                              key={h}
                              className="absolute w-3 h-3 bg-white border-2 border-[var(--accent)] rounded-sm shadow"
                              style={{
                                top: h.includes('n') ? -6 : undefined,
                                bottom: h.includes('s') ? -6 : undefined,
                                left: h.includes('w') ? -6 : undefined,
                                right: h.includes('e') ? -6 : undefined,
                                cursor: `${h}-resize`,
                              }}
                              onPointerDown={e => onResizePointerDown(e, sig, h)}
                            />
                          ))}
                          {isSel && (
                            <button
                              className="absolute -top-4 -right-4 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors"
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
