import React, { useState, useRef, useEffect } from 'react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import toast from 'react-hot-toast'
import JSZip from 'jszip'
import {
  Upload, Trash2, Download, X, Check, Loader2, FileText,
  Plus, Sliders, Type, Grid, Layers, RefreshCw, Eye, ChevronLeft, ChevronRight,
  Archive, FileDown, Settings, CheckSquare
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { SEO } from '../../components/SEO'
import { Background } from '../../components/Background'
import { formatBytes } from '../../lib/utils'
import { PdfPagePreview } from '../../components/ui/PdfPagePreview'
import { downloadBytes, downloadBlob, baseName } from '../../lib/pdfToolHelpers'
import { getToolById } from '../../lib/toolsData'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

// ─── Algorithmic Range Helpers ────────────────────────────────────────────────

function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const pages = new Set<number>()
  const parts = rangeStr.split(',')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0) {
        const from = Math.min(start, end)
        const to = Math.min(Math.max(start, end), maxPages)
        for (let i = from; i <= to; i++) {
          pages.add(i)
        }
      }
    } else {
      const num = parseInt(trimmed, 10)
      if (!isNaN(num) && num > 0 && num <= maxPages) {
        pages.add(num)
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b)
}

function compressPagesToRangeString(pages: number[]): string {
  if (pages.length === 0) return ''
  const sorted = [...pages].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      if (start === end) {
        ranges.push(`${start}`)
      } else {
        ranges.push(`${start}-${end}`)
      }
      start = sorted[i]
      end = sorted[i]
    }
  }
  if (start === end) {
    ranges.push(`${start}`)
  } else {
    ranges.push(`${start}-${end}`)
  }
  return ranges.join(', ')
}

export function SplitTool() {
  const [file, setFile] = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  const [rangeInput, setRangeInput] = useState<string>('')
  const [exportMode, setExportMode] = useState<'single' | 'zip'>('single')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [activePreview, setActivePreview] = useState<{
    file: File
    fileName: string
    pageNumber: number
    totalPages: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const toolMeta = getToolById('split')!

  // ── Parse PDF Page Count ──
  useEffect(() => {
    if (!file) {
      setTotalPages(0)
      setSelectedPages([])
      setRangeInput('')
      return
    }

    let cancelled = false
    const loadToast = toast.loading('Loading PDF file details...')

    file.arrayBuffer()
      .then(buffer => pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise)
      .then(pdf => {
        if (cancelled) return
        setTotalPages(pdf.numPages)
        // Default select all
        const defaultPages = Array.from({ length: pdf.numPages }, (_, i) => i + 1)
        setSelectedPages(defaultPages)
        setRangeInput(`1-${pdf.numPages}`)
        toast.success(`PDF successfully loaded (${pdf.numPages} pages)`, { id: loadToast })
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

  // ── Input box change handler ──
  const handleRangeInputChange = (value: string) => {
    setRangeInput(value)
    // Parse on the fly
    const parsed = parsePageRange(value, totalPages)
    setSelectedPages(parsed)
  }

  // ── Card select toggle handler ──
  const togglePageSelection = (pageNum: number) => {
    let newSelected: number[]
    if (selectedPages.includes(pageNum)) {
      newSelected = selectedPages.filter(p => p !== pageNum)
    } else {
      newSelected = [...selectedPages, pageNum].sort((a, b) => a - b)
    }
    setSelectedPages(newSelected)
    setRangeInput(compressPagesToRangeString(newSelected))
  }

  // ── Preset Helpers ──
  const selectPreset = (preset: 'all' | 'none' | 'odd' | 'even' | 'invert') => {
    let newPages: number[] = []
    if (preset === 'all') {
      newPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    } else if (preset === 'none') {
      newPages = []
    } else if (preset === 'odd') {
      newPages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p % 2 !== 0)
    } else if (preset === 'even') {
      newPages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p % 2 === 0)
    } else if (preset === 'invert') {
      newPages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => !selectedPages.includes(p))
    }
    setSelectedPages(newPages)
    setRangeInput(compressPagesToRangeString(newPages))
  }

  // ── File upload drag handlers ──
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

  // ── PDF Splitting Execution ──
  const executeSplit = async () => {
    if (!file || selectedPages.length === 0) return
    setIsProcessing(true)
    const procToast = toast.loading('Extracting & compiling your pages...')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(arrayBuffer)
      
      if (exportMode === 'single') {
        // Compile all selected pages into a single PDF
        const splitDoc = await PDFDocument.create()
        const indices = selectedPages.map(p => p - 1) // 0-indexed for pdf-lib
        const copiedPages = await splitDoc.copyPages(srcDoc, indices)
        copiedPages.forEach(p => splitDoc.addPage(p))

        const pdfBytes = await splitDoc.save()
        const rangeSuffix = compressPagesToRangeString(selectedPages).replace(/,\s*/g, '_')
        downloadBytes(pdfBytes, `extracted_${rangeSuffix}_${file.name}`)
        toast.success('Pages extracted into single merged PDF!', { id: procToast })
      } else {
        // Extract each selected page as an individual PDF inside a ZIP
        const zip = new JSZip()
        for (const pageNum of selectedPages) {
          const singlePageDoc = await PDFDocument.create()
          const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [pageNum - 1])
          singlePageDoc.addPage(copiedPage)
          const bytes = await singlePageDoc.save()
          
          const pageName = `${baseName(file)}_page_${pageNum}.pdf`
          zip.file(pageName, bytes)
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        downloadBlob(zipBlob, `${baseName(file)}_extracted_pages.zip`)
        toast.success('ZIP of individual page PDFs downloaded successfully!', { id: procToast })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to split PDF. Please check your file range.', { id: procToast })
    } finally {
      setIsProcessing(false)
    }
  }

  // ─────────────────── UPLOAD SCREEN ───────────────────────────────────────────

  if (!file) {
    return (
      <div className="relative min-h-screen">
        <SEO title="Split PDF Visually — Premium Page Extractor" description="Extract specific pages, custom ranges, or individual sheets from your PDF visually. Real-time visual page cards grid and direct click selection." canonical="/tool/split" />
        <Background />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
            <Sliders className="w-3.5 h-3.5" /> Split PDF
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Split & Extract PDF Pages Visually</h1>
          <p className="text-lg opacity-60 mb-10 max-w-lg mx-auto">Upload a PDF to view page thumbnails in real-time. Visually choose exactly which pages to extract, merge them, or download all individual pages as a ZIP.</p>

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
              [Grid, 'Visual Page Grid', 'Interact with high-fidelity rendered cards for every page'],
              [CheckSquare, 'Direct Toggle Selection', 'Click page thumbnails to instantly build your export list'],
              [Archive, 'Zipped Individual Pages', 'Download each selected page as an individual PDF inside a ZIP']
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
      <SEO title="Split PDF — Advanced Visual Workspace" description="Visually select and extract pages from your PDF file dynamically with real-time visual synchronization." canonical="/tool/split" />
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">

        {/* ── Top Bar ── */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between border border-[var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sliders className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-black text-base leading-none block">Split PDF Workspace</span>
              <span className="text-[10px] opacity-45 truncate block">File: {file.name} ({formatBytes(file.size)}) · {totalPages} Pages</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFile(null)} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>

            <button
              onClick={executeSplit}
              disabled={isProcessing || selectedPages.length === 0}
              className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-[var(--accent-hover)] disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isProcessing ? 'Extracting…' : `Extract Pages (${selectedPages.length} selected)`}
            </button>
          </div>
        </div>

        {/* ── Workspace Core ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ── Left Sidebar Settings Panel ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-y-auto flex flex-col gap-5 p-5" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            
            {/* Presets Header */}
            <div>
              <p className="text-xs font-bold opacity-45 uppercase tracking-widest flex items-center mb-2">
                <Settings className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" /> Quick Presets
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => selectPreset('all')} className="py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all">
                  Select All
                </button>
                <button onClick={() => selectPreset('none')} className="py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all">
                  Clear All
                </button>
                <button onClick={() => selectPreset('odd')} className="py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all">
                  Odd Pages
                </button>
                <button onClick={() => selectPreset('even')} className="py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all">
                  Even Pages
                </button>
                <button onClick={() => selectPreset('invert')} className="col-span-2 py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all">
                  Invert Selection
                </button>
              </div>
            </div>

            {/* Custom range input sync */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest opacity-45 mb-2">
                <span className="flex items-center"><Type className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" /> Custom Range</span>
                <span>{selectedPages.length} / {totalPages} pages</span>
              </div>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => handleRangeInputChange(e.target.value)}
                className="w-full bg-[var(--background)] p-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none text-sm transition-all"
                placeholder="e.g. 1-3, 5, 8-10"
              />
              <p className="text-[10px] opacity-45 mt-1.5 leading-relaxed">
                Type individual pages or ranges separated by commas. Changes are fully synchronized with the visual cards.
              </p>
            </div>

            <hr className="border-[var(--border)]" />

            {/* Export preference mode */}
            <div>
              <p className="text-xs font-bold opacity-45 uppercase tracking-widest flex items-center mb-3">
                <Archive className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" /> Export Preference
              </p>
              
              <div className="flex flex-col gap-2.5">
                <label
                  onClick={() => setExportMode('single')}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${exportMode === 'single' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-hover)] bg-[var(--surface)]'}`}
                >
                  <FileDown className="w-5 h-5 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[var(--foreground)]">Merge to Single PDF</span>
                    <span className="text-[9px] opacity-50 block mt-0.5 leading-relaxed">Combines all selected pages into a single PDF document</span>
                  </div>
                </label>

                <label
                  onClick={() => setExportMode('zip')}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${exportMode === 'zip' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-hover)] bg-[var(--surface)]'}`}
                >
                  <Archive className="w-5 h-5 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[var(--foreground)]">Extract as ZIP</span>
                    <span className="text-[9px] opacity-50 block mt-0.5 leading-relaxed">Saves each selected page as an individual PDF file zipped up</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* ── Right Panel: Visually Interactive Grid Preview ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-in fade-in duration-300" style={{ minHeight: 500, maxHeight: 'calc(100vh - 200px)' }}>
            
            {/* HUD Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4.5 border-b border-[var(--border)] gap-4 bg-[var(--surface)]/30">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Visual PDF Pages Grid</span>
              </div>
              <span className="text-[10px] opacity-45 font-semibold hidden md:block">
                Click any page card to toggle selection. Click magnifying glass icon to preview in high quality.
              </span>
            </div>

            {/* Visual Grid Scrollable Area */}
            <div className="flex-1 overflow-auto p-6 bg-[var(--surface)]/10">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNum = index + 1
                  const isSelected = selectedPages.includes(pageNum)

                  return (
                    <div
                      key={pageNum}
                      onClick={() => togglePageSelection(pageNum)}
                      className={`group bg-[var(--surface)] border rounded-2xl overflow-hidden shadow-sm relative transition-all cursor-pointer flex flex-col w-full select-none ${isSelected ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)] hover:border-gray-400'}`}
                    >
                      {/* Top indicator bar */}
                      <div className={`px-2.5 py-2 text-[9px] font-bold flex items-center justify-between gap-1 select-none shrink-0 ${isSelected ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-b border-[var(--accent)]/20' : 'bg-[var(--background)] border-b border-[var(--border)] text-gray-500'}`}>
                        <span>Page {pageNum}</span>
                        {isSelected ? (
                          <span className="bg-[var(--accent)] text-white p-0.5 rounded-full">
                            <Check className="w-2 h-2" />
                          </span>
                        ) : null}
                      </div>

                      {/* PDF Thumbnail Preview area */}
                      <div className="h-[135px] bg-white flex justify-center items-center relative overflow-hidden p-3 shrink-0">
                        <PdfPagePreview
                          file={file}
                          pageNumber={pageNum}
                          maxHeight={125}
                          scale={0.35}
                          className="shadow-sm border border-gray-50 max-h-[125px]"
                        />

                        {/* Visual Hover Preview Button */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActivePreview({
                                file,
                                fileName: file.name,
                                pageNumber: pageNum,
                                totalPages
                              })
                            }}
                            className="w-8.5 h-8.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 pointer-events-auto cursor-pointer"
                            title="Preview Page"
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

              {/* Modal Body / Large Canvas Preview (Fixed top cutoff issue) */}
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
