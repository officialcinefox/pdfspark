import React, { useState, useRef, useEffect } from 'react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import toast from 'react-hot-toast'
import {
  Upload, Trash2, Download, X, Check, Loader2, FileText,
  Plus, GripVertical, Sliders, Type, Grid, Layers, RefreshCw
} from 'lucide-react'
import { Reorder, AnimatePresence } from 'motion/react'
import { SEO } from '../../components/SEO'
import { Background } from '../../components/Background'
import { formatBytes } from '../../lib/utils'
import { PdfPagePreview } from '../../components/ui/PdfPagePreview'
import { downloadBytes } from '../../lib/pdfToolHelpers'
import { getToolById } from '../../lib/toolsData'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

// ─── Types ───────────────────────────────────────────────────────────────────

type RangeMode = 'all' | 'odd' | 'even' | 'custom'

interface MergeFileItem {
  id: string
  file: File
  totalPages: number
  rangeMode: RangeMode
  customRange: string
  size: number
}

interface PreviewPage {
  fileItemId: string
  file: File
  pageNumber: number // 1-indexed
  fileName: string
}

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
  const ranges: string[] = []
  let start = pages[0]
  let end = pages[0]
  for (let i = 1; i < pages.length; i++) {
    if (pages[i] === end + 1) {
      end = pages[i]
    } else {
      if (start === end) {
        ranges.push(`${start}`)
      } else {
        ranges.push(`${start}-${end}`)
      }
      start = pages[i]
      end = pages[i]
    }
  }
  if (start === end) {
    ranges.push(`${start}`)
  } else {
    ranges.push(`${start}-${end}`)
  }
  return ranges.join(', ')
}

function getFilePagesList(item: MergeFileItem): number[] {
  if (item.rangeMode === 'all') {
    return Array.from({ length: item.totalPages }, (_, i) => i + 1)
  }
  if (item.rangeMode === 'odd') {
    return Array.from({ length: item.totalPages }, (_, i) => i + 1).filter(p => p % 2 !== 0)
  }
  if (item.rangeMode === 'even') {
    return Array.from({ length: item.totalPages }, (_, i) => i + 1).filter(p => p % 2 === 0)
  }
  return parsePageRange(item.customRange || '', item.totalPages)
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MergeTool() {
  const [items, setItems] = useState<MergeFileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const appendInputRef = useRef<HTMLInputElement>(null)
  
  const toolMeta = getToolById('merge')!

  // ── File parsing ──
  async function loadPdfFileDetails(file: File): Promise<MergeFileItem> {
    const arrayBuffer = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    return {
      id: Math.random().toString(36).substring(2, 11),
      file,
      totalPages: doc.numPages,
      rangeMode: 'all',
      customRange: `1-${doc.numPages}`,
      size: file.size
    }
  }

  async function handleFilesSelected(files: FileList | null, isAppend = false) {
    if (!files || files.length === 0) return
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (pdfs.length === 0) {
      toast.error('Please upload valid PDF files only.')
      return
    }

    const loadToast = toast.loading(`Loading ${pdfs.length} PDF file(s)...`)
    try {
      const newItems = await Promise.all(pdfs.map(f => loadPdfFileDetails(f)))
      if (isAppend) {
        setItems(p => [...p, ...newItems])
      } else {
        setItems(newItems)
      }
      toast.success(`${pdfs.length} file(s) loaded successfully`, { id: loadToast })
    } catch (e) {
      toast.error('Failed to parse some PDF files. They may be password-protected or corrupted.', { id: loadToast })
    }
  }

  function onFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingFile(false)
    handleFilesSelected(e.dataTransfer.files, items.length > 0)
  }

  // ── Drag Reordering ──
  const handleReorder = (newItems: MergeFileItem[]) => {
    setItems(newItems)
  }

  // ── Visual Page-Level Exclusions ──
  function handleRemovePreviewPage(fileItemId: string, pageNum: number) {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== fileItemId) return item
        const currentPages = getFilePagesList(item)
        const newPages = currentPages.filter(p => p !== pageNum)
        return {
          ...item,
          rangeMode: 'custom' as RangeMode,
          customRange: compressPagesToRangeString(newPages)
        }
      })
    )
    toast.success(`Page ${pageNum} excluded from output`)
  }

  // ── PDF Merging & Exporting ──
  async function executeMerge() {
    if (items.length < 1) {
      toast.error('Please add at least 1 PDF file.')
      return
    }
    
    // Check if at least 1 page total is selected across all files
    const totalSelectedPages = items.reduce((sum, item) => sum + getFilePagesList(item).length, 0)
    if (totalSelectedPages === 0) {
      toast.error('Please select at least one page to merge.')
      return
    }

    setIsProcessing(true)
    const procToast = toast.loading('Merging selected pages...')
    try {
      const mergedDoc = await PDFDocument.create()

      for (const item of items) {
        const pagesList = getFilePagesList(item)
        if (pagesList.length === 0) continue

        const fileBuffer = await item.file.arrayBuffer()
        const sourceDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true } as any)
        
        // pdf-lib requires 0-indexed indices
        const indicesToCopy = pagesList.map(p => p - 1)
        const copiedPages = await mergedDoc.copyPages(sourceDoc, indicesToCopy)
        copiedPages.forEach(p => mergedDoc.addPage(p))
      }

      const outBytes = await mergedDoc.save({ useObjectStreams: true })
      downloadBytes(outBytes, 'merged-pdfspark.pdf')
      
      // Auto-reset workspace settings
      setItems([])
      toast.success('PDFs merged and downloaded successfully!', { id: procToast })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to merge files.', { id: procToast })
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Flattened Preview Pages array ──
  const previewPages: PreviewPage[] = []
  items.forEach(item => {
    const list = getFilePagesList(item)
    list.forEach(pageNum => {
      previewPages.push({
        fileItemId: item.id,
        file: item.file,
        pageNumber: pageNum,
        fileName: item.file.name
      })
    })
  })

  // ─────────────────── UPLOAD SCREEN ───────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="relative min-h-screen">
        <SEO title="Merge PDF Pages visually — Premium Interactive PDF Merger" description="Drag-and-order PDF files, customize exact page ranges (odd, even, specific pages) and preview visual output in real-time." canonical="/tool/merge" />
        <Background />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
            <Layers className="w-3.5 h-3.5" /> Merge PDF
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Merge PDF Documents Visually</h1>
          <p className="text-lg opacity-60 mb-10 max-w-lg mx-auto">Reorder multiple PDF files easily and select precisely which pages to merge (All, Odd, Even, or Custom Ranges) with real-time visual page previews.</p>

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
                <p className="text-xl font-bold mb-1">Drag your PDFs here</p>
                <p className="opacity-50 text-sm">or click to browse from device</p>
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-lg">
                <Plus className="w-4 h-4" /> Add PDFs
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => { handleFilesSelected(e.target.files); e.target.value = '' }} />

          <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-left">
            {([
              [Sliders, 'Advanced Ranges', 'Choose All, Odd, Even, or exact custom ranges per file'],
              [Grid, 'Visual Preview Sequence', 'See every final page card before compiling'],
              [Trash2, 'Instant Exclude', 'Remove single pages with a single click']
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
      <SEO title="Merge PDF — Advanced Visual Workspace" description="Drag files to reorder, select ranges, and preview final pages." canonical="/tool/merge" />
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">

        {/* ── Top Bar ── */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between border border-[var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-black text-base leading-none block">Merge PDF Workspace</span>
              <span className="text-[10px] opacity-40 truncate block">{items.length} PDF file{items.length > 1 ? 's' : ''} loaded</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setItems([])} className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>
            <button
              onClick={() => appendInputRef.current?.click()}
              className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent)]" /> Add More
            </button>
            <input ref={appendInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => { handleFilesSelected(e.target.files, true); e.target.value = '' }} />

            <button
              onClick={executeMerge}
              disabled={isProcessing || previewPages.length === 0}
              className="h-8 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-[var(--accent-hover)] disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isProcessing ? 'Merging…' : `Merge & Download (${previewPages.length} pages)`}
            </button>
          </div>
        </div>

        {/* ── Main content: Sidebar + Pages Sequence grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ── Left Sidebar: Draggable Files & Ranges Selector ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-y-auto flex flex-col gap-3 p-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <p className="text-xs font-bold opacity-45 uppercase tracking-widest flex items-center px-1">
              <Sliders className="w-3.5 h-3.5 mr-1.5" /> Order & Range Rules
            </p>
            <p className="text-[10px] opacity-50 px-1">Drag files to change compile order. Set custom page ranges for individual files.</p>

            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-3">
              <AnimatePresence>
                {items.map(item => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:border-[var(--border-hover)] transition-all shadow-sm"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-[var(--foreground)]">{item.file.name}</p>
                          <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-0.5">
                            {item.totalPages} Pages · {formatBytes(item.size)}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setItems(p => p.filter(i => i.id !== item.id))
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Range Tabs */}
                    <div className="grid grid-cols-4 rounded-xl bg-[var(--background)] p-1 gap-1 border border-[var(--border)] mt-1">
                      {([['all', 'All'], ['odd', 'Odd'], ['even', 'Even'], ['custom', 'Range']] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          onClick={(e) => {
                            e.stopPropagation()
                            setItems(prev =>
                              prev.map(i => i.id === item.id ? { ...i, rangeMode: mode } : i)
                            )
                          }}
                          className={`py-1.5 rounded-lg text-[9px] font-bold transition-all ${item.rangeMode === mode ? 'bg-[var(--accent)] text-white shadow' : 'hover:bg-[var(--surface-hover)]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Custom range input field */}
                    {item.rangeMode === 'custom' && (
                      <div className="space-y-1 mt-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-[8px] uppercase tracking-wider font-bold opacity-45 px-0.5">
                          <span>Enter Page Ranges</span>
                          <span>Selected: {getFilePagesList(item).length} pages</span>
                        </div>
                        <input
                          type="text"
                          value={item.customRange}
                          onChange={(e) => {
                            const val = e.target.value
                            setItems(prev =>
                              prev.map(i => i.id === item.id ? { ...i, customRange: val } : i)
                            )
                          }}
                          className="w-full bg-[var(--background)] p-1.5 rounded-lg text-xs border border-[var(--border)] focus:ring-1 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                          placeholder="e.g. 1-3, 5, 7-10"
                        />
                      </div>
                    )}
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>

          {/* ── Right Panel: Final Visual Output Pages Grid ── */}
          <div className="glass-panel rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden" style={{ minHeight: 500, maxHeight: 'calc(100vh - 200px)' }}>
            
            {/* HUD Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] gap-4">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Visual Sequence Preview</span>
              </div>
              <span className="text-[10px] opacity-40 font-semibold hidden md:block">
                This shows the exact resulting page cards. Hover and click Trash to instantly exclude.
              </span>
            </div>

            {/* Scrollable grid area */}
            <div className="flex-1 overflow-auto p-6 bg-[var(--surface)]/40">
              {previewPages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {previewPages.map((page, index) => (
                    <div
                      key={`${page.fileItemId}-${page.pageNumber}-${index}`}
                      className="group bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl overflow-hidden shadow-sm relative transition-all"
                    >
                      {/* Top bar on card */}
                      <div className="bg-[var(--background)] border-b border-[var(--border)] px-2 py-1 text-[9px] font-bold flex items-center justify-between gap-1 select-none">
                        <span className="truncate opacity-65 flex-1">{page.fileName}</span>
                        <span className="text-[var(--accent)] shrink-0">P. {page.pageNumber}</span>
                      </div>

                      {/* Image Preview Canvas */}
                      <div className="p-3 bg-white flex justify-center items-center relative" style={{ minHeight: 140 }}>
                        <PdfPagePreview
                          file={page.file}
                          pageNumber={page.pageNumber}
                          maxHeight={140}
                          scale={0.5}
                          className="shadow-sm border border-gray-100"
                        />

                        {/* Interactive Exclude Hover Button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <button
                            onClick={() => handleRemovePreviewPage(page.fileItemId, page.pageNumber)}
                            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 pointer-events-auto cursor-pointer"
                            title="Exclude this page"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom position count */}
                      <div className="bg-[var(--background)]/40 border-t border-[var(--border)]/40 text-center py-1 text-[8px] font-bold uppercase tracking-wider opacity-35 select-none">
                        Merged Pos {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                  <FileText className="w-12 h-12" />
                  <p className="text-sm font-bold">No pages selected to merge.</p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Bottom spacer */}
        <div className="pb-4" />
      </div>
    </div>
  )
}
