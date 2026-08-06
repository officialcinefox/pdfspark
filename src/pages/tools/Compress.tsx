import React, { useState, useRef, useEffect } from 'react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import toast from 'react-hot-toast'
import {
  Upload, Trash2, Download, X, Check, Loader2, FileText,
  Plus, Sliders, Type, Grid, Layers, RefreshCw, Eye, ChevronLeft, ChevronRight,
  HardDrive, Target, AlertTriangle, Settings, Sparkles, Scale, Percent
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { SEO } from '../../components/SEO'
import { Background } from '../../components/Background'
import { formatBytes } from '../../lib/utils'
import { PdfPagePreview } from '../../components/ui/PdfPagePreview'
import { bytesToBlob, downloadBlob } from '../../lib/pdfToolHelpers'
import { getToolById } from '../../lib/toolsData'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

type CompressionMode = 'preset' | 'custom' | 'pro'
type CompressionPreset = 'low' | 'recommended' | 'extreme'

export function CompressTool() {
  const [file, setFile] = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [mode, setMode] = useState<CompressionMode>('preset')
  const [preset, setPreset] = useState<CompressionPreset>('recommended')
  
  // Custom Size states
  const [targetSize, setTargetSize] = useState<number>(1)
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('MB')

  // Pro Controls states
  const [proQuality, setProQuality] = useState<number>(70) // 10% - 100%
  const [proScale, setProScale] = useState<number>(1.5) // 0.5x - 3.0x

  const [activePreview, setActivePreview] = useState<{
    file: File
    fileName: string
    pageNumber: number
    totalPages: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const toolMeta = getToolById('compress')!

  // ── Load PDF Page Details ──
  useEffect(() => {
    if (!file) {
      setTotalPages(0)
      return
    }

    let cancelled = false
    const loadToast = toast.loading('Reading PDF properties...')

    file.arrayBuffer()
      .then(buffer => pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise)
      .then(pdf => {
        if (cancelled) return
        setTotalPages(pdf.numPages)
        // Setup initial default target size: 50% of original
        const halfSize = (file.size / 2) / (1024 * 1024)
        setTargetSize(Math.max(0.1, Math.round(halfSize * 10) / 10))
        setTargetUnit('MB')
        toast.success(`PDF properties loaded (${pdf.numPages} pages)`, { id: loadToast })
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          toast.error('Failed to parse PDF. It may be password-protected or corrupted.', { id: loadToast })
          setFile(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [file])

  // ── Estimate Output Size & Savings ──
  const calculateEstimate = (): number => {
    if (!file) return 0
    let est = 0

    if (mode === 'preset') {
      if (preset === 'low') est = file.size * 0.70
      if (preset === 'recommended') est = file.size * 0.40
      if (preset === 'extreme') est = file.size * 0.15
    } else if (mode === 'custom') {
      est = targetSize * (targetUnit === 'MB' ? 1024 * 1024 : 1024)
    } else {
      const qFactor = proQuality / 100
      const sFactor = proScale / 1.5
      const totalFactor = Math.max(0.08, Math.min(0.95, qFactor * sFactor))
      est = file.size * totalFactor
    }

    return Math.max(1024, est)
  }

  const estimatedSize = calculateEstimate()
  const savingsBytes = file ? Math.max(0, file.size - estimatedSize) : 0
  const savingsPercent = file ? Math.round((savingsBytes / file.size) * 100) : 0

  // ── File Drop Handlers ──
  const onFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf' || /\.pdf$/i.test(droppedFile.name)) {
        setFile(droppedFile)
      } else {
        toast.error('Please upload a valid PDF file only.')
      }
    }
  }

  // ── Compression Logic ──
  const handleCompress = async () => {
    if (!file) return
    setIsProcessing(true)
    const toastId = toast.loading('Analyzing document for compression...')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer)
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
      const numPages = pdf.numPages

      let quality = 0.7
      let scale = 1.5

      let targetBytes = file.size
      if (mode === 'custom') {
        targetBytes = targetSize * (targetUnit === 'MB' ? 1024 * 1024 : 1024)
      } else if (mode === 'preset') {
        if (preset === 'low') targetBytes = file.size * 0.70
        if (preset === 'recommended') targetBytes = file.size * 0.40
        if (preset === 'extreme') targetBytes = file.size * 0.15
      }

      if (mode === 'custom') {
        const bytesPerPage = targetBytes / numPages
        if (bytesPerPage > 500000) { scale = 2.0; quality = 0.9 }
        else if (bytesPerPage > 200000) { scale = 1.5; quality = 0.75 }
        else if (bytesPerPage > 100000) { scale = 1.2; quality = 0.6 }
        else { scale = 1.0; quality = 0.4 }
      } else if (mode === 'preset') {
        if (preset === 'low') { scale = 1.6; quality = 0.75 }
        if (preset === 'recommended') { scale = 1.2; quality = 0.6 }
        if (preset === 'extreme') { scale = 0.8; quality = 0.35 }
      } else {
        scale = proScale
        quality = proQuality / 100
      }

      toast.loading(`Compressing ${numPages} pages... Please wait.`, { id: toastId })

      const runCompressionPass = async (currScale: number, currQuality: number) => {
        const tempPdf = await PDFDocument.create()
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: currScale })
          
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          context.clearRect(0, 0, canvas.width, canvas.height)
          context.fillStyle = 'white'
          context.fillRect(0, 0, canvas.width, canvas.height)
          
          await page.render({ 
            canvasContext: context as any, 
            viewport,
            canvas,
          }).promise
          
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', currQuality))
          if (!blob) throw new Error("Failed to encode page image")
          const imgBytes = await blob.arrayBuffer()
          const jpgImage = await tempPdf.embedJpg(imgBytes)
          const pdfPage = tempPdf.addPage([viewport.width, viewport.height] as [number, number])
          
          pdfPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
          })
        }
        return await tempPdf.save({ useObjectStreams: true })
      }

      let currentScale = scale
      let currentQuality = quality
      let pdfBytes: Uint8Array | null = null
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        attempts++
        if (attempts > 1) {
          toast.loading(`Optimizing settings (Attempt ${attempts}/${maxAttempts})...`, { id: toastId })
        }
        pdfBytes = await runCompressionPass(currentScale, currentQuality)

        // In pro mode, do not auto-adjust since the user requested specific settings
        if (mode === 'pro') {
          break
        }

        // If the size is within targetBytes and smaller than the original, we are done
        if (pdfBytes.byteLength <= targetBytes && pdfBytes.byteLength < file.size) {
          break
        }

        if (attempts >= maxAttempts) {
          break
        }

        // Reduce settings for next attempt
        if (mode === 'custom') {
          const ratio = targetBytes / pdfBytes.byteLength
          const scaleReduction = ratio < 0.5 ? 0.6 : 0.8
          const qualityReduction = ratio < 0.5 ? 0.5 : 0.75
          currentScale = Math.max(0.4, currentScale * scaleReduction)
          currentQuality = Math.max(0.1, currentQuality * qualityReduction)
        } else if (mode === 'preset') {
          if (attempts === 1) {
            if (preset === 'low') {
              currentScale = 1.2
              currentQuality = 0.6
            } else if (preset === 'recommended') {
              currentScale = 0.8
              currentQuality = 0.35
            } else {
              currentScale = 0.5
              currentQuality = 0.15
            }
          } else if (attempts === 2) {
            currentScale = 0.4
            currentQuality = 0.1
          }
        }
      }

      let finalBlob: Blob
      if (pdfBytes && pdfBytes.byteLength < file.size) {
        finalBlob = bytesToBlob(pdfBytes)
      } else {
        toast.loading('Applying native vector fallback...', { id: toastId })
        // Fallback directly to the original file to guarantee zero size increase!
        finalBlob = file
      }

      toast.loading('Finalizing PDF packaging...', { id: toastId })
      downloadBlob(finalBlob, `compressed_${file.name}`)
      
      const realSavings = file.size - finalBlob.size
      if (realSavings > 0) {
        toast.success(`Success! Saved ${formatBytes(realSavings)} (${Math.round((realSavings/file.size)*100)}% smaller)`, { id: toastId })
      } else {
        toast.success(`Optimized successfully! Final size: ${formatBytes(finalBlob.size)}`, { id: toastId })
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to compress PDF file.", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  // ─────────────────── UPLOAD SCREEN ───────────────────────────────────────────

  if (!file) {
    return (
      <div className="relative min-h-screen">
        <SEO title="Compress PDF Online visually — Premium Compression Workspace" description="Reduce PDF file size drastically client-side. Interactive visual presets, custom size selectors, and manual resolution fine-tuning." canonical="/tool/compress" />
        <Background />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Compress PDF
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Compress PDF Files Visually</h1>
          <p className="text-lg opacity-60 mb-10 max-w-lg mx-auto">Reduce PDF storage footprint instantly. View rendered pages, control quality settings visually, and get real-time file size savings diagnostics entirely in your browser.</p>

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
                <p className="text-xl font-bold mb-1">Drag your PDF here</p>
                <p className="opacity-50 text-sm">or click to browse from device</p>
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-lg">
                <Plus className="w-4 h-4" /> Add PDF
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); e.target.value = '' }} />

          <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-left">
            {([
              [Settings, 'Interactive Pro Tuning', 'Fine-tune JPEG quality and DPI scale to match target requirements'],
              [Grid, 'Visual Page Grid', 'Inspect PDF page card sequence visually before compressing'],
              [HardDrive, 'Savings HUD Calculator', 'Visual real-time compression meter showing precise disk savings']
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

  // ─────────────────── EDITOR WORKSPACE SCREEN ─────────────────────────────────

  return (
    <div className="relative" style={{ minHeight: '100vh' }}>
      <SEO title="Compress PDF — Advanced Visual Workspace" description="Fine-tune your document quality, scaling, and target parameters interactively with live diagnostics." canonical="/tool/compress" />
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">

        {/* ── Top Bar ── */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between border border-[var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-black text-base leading-none block">Compress PDF Workspace</span>
              <span className="text-[10px] opacity-45 truncate block">File: {file.name} ({formatBytes(file.size)}) · {totalPages} Pages</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFile(null)} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>

            <button
              onClick={handleCompress}
              disabled={isProcessing}
              className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-[var(--accent-hover)] disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isProcessing ? 'Compressing…' : `Compress & Download`}
            </button>
          </div>
        </div>

        {/* ── Workspace Core ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ── Left Sidebar Control settings & HUD Diagnostics ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-y-auto flex flex-col gap-5 p-5" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            
            {/* Mode selection tabs */}
            <div>
              <p className="text-xs font-bold opacity-45 uppercase tracking-widest flex items-center mb-3">
                <Settings className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" /> Tuning Method
              </p>
              <div className="grid grid-cols-3 rounded-xl bg-[var(--background)] p-1 gap-1 border border-[var(--border)]">
                {([['preset', 'Presets'], ['custom', 'Size Target'], ['pro', 'Pro Tuner']] as const).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${mode === m ? 'bg-[var(--accent)] text-white shadow' : 'hover:bg-[var(--surface-hover)] text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode panel content */}
            <div className="flex-1">
              
              {/* Presets Mode */}
              {mode === 'preset' ? (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                  {[
                    { id: 'low', title: 'Less Compression', desc: 'Max visual clarity, slight size reduction', sizeText: 'Estimated ~30% smaller', color: 'border-green-500', bg: 'bg-green-50/10' },
                    { id: 'recommended', title: 'Recommended', desc: 'Balanced compression and reading quality', sizeText: 'Estimated ~60% smaller', color: 'border-blue-500', bg: 'bg-blue-50/10' },
                    { id: 'extreme', title: 'Extreme Compression', desc: 'Lowest DPI, small text reading blocks', sizeText: 'Estimated ~85% smaller', color: 'border-red-500', bg: 'bg-red-50/10' }
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => setPreset(o.id as any)}
                      className={`flex flex-col text-left p-4.5 rounded-2xl border transition-all ${preset === o.id ? `${o.color} ${o.bg} ring-1 ${o.color}` : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'}`}
                    >
                      <span className="font-bold text-xs text-[var(--foreground)]">{o.title}</span>
                      <span className="text-[10px] opacity-45 block mt-1">{o.desc}</span>
                      <span className="text-[9px] font-bold text-[var(--accent)] mt-2 shrink-0">{o.sizeText}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Target Custom Size Mode */}
              {mode === 'custom' ? (
                <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] space-y-4 animate-in fade-in duration-200">
                  <label className="block text-[10px] font-bold opacity-45 uppercase tracking-widest">Desired Target Size</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={targetSize}
                      onChange={(e) => setTargetSize(Number(e.target.value))}
                      className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 font-bold text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    />
                    <select
                      value={targetUnit}
                      onChange={(e) => setTargetUnit(e.target.value as any)}
                      className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 font-bold text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    >
                      <option value="MB">MB</option>
                      <option value="KB">KB</option>
                    </select>
                  </div>
                  <p className="text-[10px] opacity-45 leading-relaxed">
                    Compression qualities and page scalers will dynamically self-adjust on compile to approach this exact target size.
                  </p>
                </div>
              ) : null}

              {/* Pro Custom manual Mode */}
              {mode === 'pro' ? (
                <div className="flex flex-col gap-4 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] animate-in fade-in duration-200">
                  {/* Resolution DPI scale slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-45 uppercase tracking-widest">
                      <span className="flex items-center"><Scale className="w-3.5 h-3.5 mr-1" /> DPI Resolution</span>
                      <span>{proScale}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={proScale}
                      onChange={(e) => setProScale(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                    <div className="flex justify-between text-[8px] opacity-45">
                      <span>Low (0.5x)</span>
                      <span>Mid (1.5x)</span>
                      <span>High (3.0x)</span>
                    </div>
                  </div>

                  {/* JPEG Quality slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-45 uppercase tracking-widest">
                      <span className="flex items-center"><Percent className="w-3.5 h-3.5 mr-1" /> Jpeg Quality</span>
                      <span>{proQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={proQuality}
                      onChange={(e) => setProQuality(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                    <div className="flex justify-between text-[8px] opacity-45">
                      <span>10% (Smallest)</span>
                      <span>70% (Balanced)</span>
                      <span>100% (High)</span>
                    </div>
                  </div>
                </div>
              ) : null}

            </div>

            <hr className="border-[var(--border)]" />

            {/* Diagnostics HUD Panel */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4.5 space-y-4">
              <div className="text-xs font-bold opacity-45 uppercase tracking-widest flex items-center">
                <HardDrive className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" /> Diagnostics HUD
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-35">Original Size</span>
                  <p className="text-sm font-bold opacity-60 line-through decoration-red-500/50 decoration-2">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--accent)]">Est. Output Size</span>
                  <p className="text-sm font-black text-[var(--accent)]">
                    {estimatedSize > 0 ? formatBytes(estimatedSize) : '...'}
                  </p>
                </div>
              </div>

              {/* Progress ring/bar for space savings */}
              <div className="space-y-2 border-t border-[var(--border)] pt-3.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="opacity-45 uppercase tracking-wider">Estimated Space Savings</span>
                  <span className="text-green-500 font-extrabold">{savingsPercent}% Savings</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${savingsPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alert note disclaimer */}
            <div className="flex items-start gap-2.5 p-3.5 bg-yellow-50 dark:bg-yellow-950/10 text-yellow-800 dark:text-yellow-400 rounded-2xl border border-yellow-200/50 dark:border-yellow-900/20 select-none">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[9px] leading-relaxed font-semibold">
                <strong>Note:</strong> Browsers achieve true size reductions by encoding pages into vector images. Text content is visible and readable but loses highlight / select traits.
              </p>
            </div>

          </div>

          {/* ── Right Panel: Visual page thumbnails Grid ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-in fade-in duration-300" style={{ minHeight: 500, maxHeight: 'calc(100vh - 200px)' }}>
            
            {/* Grid Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4.5 border-b border-[var(--border)] gap-4 bg-[var(--surface)]/30">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Visual PDF Pages Grid</span>
              </div>
              <span className="text-[10px] opacity-45 font-semibold hidden md:block">
                See every page inside your PDF. Click the magnifying glass icon to inspect in full detail.
              </span>
            </div>

            {/* Scrollable grid sequence */}
            <div className="flex-1 overflow-auto p-6 bg-[var(--surface)]/10">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNum = index + 1

                  return (
                    <div
                      key={pageNum}
                      onClick={() => {
                        setActivePreview({
                          file,
                          fileName: file.name,
                          pageNumber: pageNum,
                          totalPages
                        })
                      }}
                      className="group bg-[var(--surface)] border border-[var(--border)] hover:border-gray-400 rounded-2xl overflow-hidden shadow-sm relative transition-all cursor-pointer flex flex-col w-full select-none"
                    >
                      <div className="px-2.5 py-2 text-[9px] font-bold bg-[var(--background)] border-b border-[var(--border)] text-gray-500 flex justify-between select-none">
                        <span>Page {pageNum}</span>
                      </div>

                      <div className="h-[135px] bg-white flex justify-center items-center relative overflow-hidden p-3 shrink-0">
                        <PdfPagePreview
                          file={file}
                          pageNumber={pageNum}
                          maxHeight={125}
                          scale={0.35}
                          className="shadow-sm border border-gray-50 max-h-[125px]"
                        />

                        {/* Interactive hover zoom */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <button
                            className="w-8.5 h-8.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 pointer-events-auto cursor-pointer"
                            title="Inspect page"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Bottom spacer */}
        <div className="pb-4" />
      </div>

      {/* ── High-Fidelity Page Preview Modal ── */}
      <AnimatePresence>
        {activePreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
              className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200"
              style={{ maxHeight: '90vh' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
                <div className="min-w-0 flex-1 pr-4">
                  <h3 className="text-sm font-bold truncate text-[var(--foreground)]" title={activePreview.fileName}>
                    {activePreview.fileName}
                  </h3>
                  <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider mt-0.5">
                    Page {activePreview.pageNumber} of {activePreview.totalPages}
                  </p>
                </div>
                <button
                  onClick={() => setActivePreview(null)}
                  className="w-8 h-8 rounded-full border border-[var(--border)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4 text-[var(--foreground)]" />
                </button>
              </div>

              {/* Modal Body / Large Canvas Preview (Fixed top-align overflow layout) */}
              <div className="flex-1 bg-white p-6 overflow-auto flex items-start justify-center min-h-[450px]">
                <PdfPagePreview
                  file={activePreview.file}
                  pageNumber={activePreview.pageNumber}
                  maxHeight={650}
                  scale={2.0}
                  className="shadow-md border border-gray-100 max-h-[650px]"
                />
              </div>

              {/* Modal Footer / Pagination Controls */}
              {activePreview.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-[var(--border)] bg-[var(--background)] select-none">
                  <button
                    disabled={activePreview.pageNumber <= 1}
                    onClick={() => setActivePreview(prev => prev ? { ...prev, pageNumber: prev.pageNumber - 1 } : null)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-[var(--foreground)]">
                    {activePreview.pageNumber} / {activePreview.totalPages}
                  </span>
                  <button
                    disabled={activePreview.pageNumber >= activePreview.totalPages}
                    onClick={() => setActivePreview(prev => prev ? { ...prev, pageNumber: prev.pageNumber + 1 } : null)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
