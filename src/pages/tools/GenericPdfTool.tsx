import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { Check, FileText, Image as ImageIcon, Type, Move, Eye, ChevronLeft, ChevronRight, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as pdfjsLib from 'pdfjs-dist'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { PdfPagePreview } from '../../components/ui/PdfPagePreview'
import { TOOL_CATEGORIES } from '../../lib/toolsData'
import {
  PDF_ACCEPT,
  DOC_ACCEPT,
  SHEET_ACCEPT,
  PRESENTATION_ACCEPT,
  TEXT_ACCEPT,
  HTML_ACCEPT,
  baseName,
  loadPdf,
  savePdf,
  safePdfText,
  parsePageSelection,
  pageSizeFromName,
  downloadBlob,
  extractPdfText,
  createPdfFromText,
  officeFileToText,
  officeFileToRows,
  fileToText,
  stripHtml,
  renderPdfPagesToPng,
  drawCenteredText,
  wrapText,
  uniqueSorted
} from '../../lib/pdfToolHelpers'

type GenericToolId =
  | 'delete-pages' | 'reorder-pages' | 'duplicate-pages' | 'insert-blank-page' | 'extract-pages'
  | 'crop-pdf' | 'organize-pdf' | 'pdf-to-image' | 'word-to-pdf' | 'pdf-to-word' | 'pdf-to-text'
  | 'excel-to-pdf' | 'pdf-to-excel' | 'powerpoint-to-pdf' | 'pdf-to-powerpoint' | 'text-to-pdf'
  | 'html-to-pdf' | 'digital-signature' | 'remove-restrictions' | 'watermark' | 'page-numbers'
  | 'highlight-text' | 'add-notes' | 'draw-on-pdf' | 'add-shapes' | 'fill-forms' | 'edit-text'

type SourcePreview =
  | { kind: 'empty' }
  | { kind: 'pdf' }
  | { kind: 'text'; title: string; text: string; meta: string }
  | { kind: 'table'; title: string; rows: string[][]; meta: string }
  | { kind: 'error'; title: string; message: string }

const CONFIG: Record<string, any> = {
  'delete-pages': pdfConfig('Delete Pages', 'Remove selected pages'),
  'reorder-pages': pdfConfig('Reorder Pages', 'Create PDF in selected order'),
  'duplicate-pages': pdfConfig('Duplicate Pages', 'Clone selected pages'),
  'insert-blank-page': pdfConfig('Insert Blank Page', 'Add blank pages'),
  'extract-pages': pdfConfig('Extract Pages', 'Export selected pages'),
  'crop-pdf': pdfConfig('Crop PDF', 'Trim page margins'),
  'organize-pdf': pdfConfig('Organize PDF', 'Reorder and remove pages'),
  'pdf-to-image': pdfConfig('Export Images', 'Download PDF pages as PNG'),
  'pdf-to-word': pdfConfig('Create Word File', 'Extract editable text'),
  'pdf-to-text': pdfConfig('Extract Text', 'Download text file'),
  'pdf-to-excel': pdfConfig('Create CSV', 'Extract rows into spreadsheet text'),
  'pdf-to-powerpoint': pdfConfig('Create Slides', 'Extract pages into editable slide text'),
  'digital-signature': pdfConfig('Sign PDF', 'Stamp a visible signature'),
  'remove-restrictions': pdfConfig('Remove Restrictions', 'Rewrite an unrestricted copy'),
  'watermark': pdfConfig('Add Watermark', 'Stamp each page'),
  'page-numbers': pdfConfig('Add Numbers', 'Insert page numbers'),
  'highlight-text': pdfConfig('Highlight Area', 'Mark pages with highlight'),
  'add-notes': pdfConfig('Add Notes', 'Add note boxes'),
  'draw-on-pdf': pdfConfig('Draw on PDF', 'Apply a pen mark'),
  'add-shapes': pdfConfig('Add Shapes', 'Draw shapes on pages'),
  'fill-forms': pdfConfig('Fill Forms', 'Fill detected form fields'),
  'edit-text': pdfConfig('Overlay Text', 'Cover an area and add new text'),
  'word-to-pdf': fileConfig(DOC_ACCEPT, 'Convert to PDF', 'Choose Word file', 'Upload DOCX or TXT'),
  'excel-to-pdf': fileConfig(SHEET_ACCEPT, 'Convert to PDF', 'Choose spreadsheet', 'Upload XLSX, CSV, or TXT'),
  'powerpoint-to-pdf': fileConfig(PRESENTATION_ACCEPT, 'Convert to PDF', 'Choose presentation', 'Upload PPTX'),
  'text-to-pdf': fileConfig(TEXT_ACCEPT, 'Convert to PDF', 'Choose text file', 'Upload TXT'),
  'html-to-pdf': fileConfig(HTML_ACCEPT, 'Convert to PDF', 'Choose HTML file', 'Upload HTML or TXT')
}

function pdfConfig(buttonText: string, uploadTitle: string) {
  return fileConfig(PDF_ACCEPT, buttonText, 'Choose PDF', `${uploadTitle} from a PDF file`)
}

function fileConfig(accept: Record<string, string[]>, buttonText: string, uploadTitle: string, uploadDescription: string) {
  return { accept, maxFiles: 1, buttonText, uploadTitle, uploadDescription }
}

export function GenericPdfTool() {
  const { toolId } = useParams()
  const tool = TOOL_CATEGORIES.flatMap((c) => c.tools).find((t) => t.id === toolId)
  const config = toolId && CONFIG[toolId] ? CONFIG[toolId] : CONFIG['watermark']

  const [isProcessing, setIsProcessing] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  // Tool states
  const [pages, setPages] = useState('')
  const [text, setText] = useState('PDF Spark')
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.3)
  const [rotation, setRotation] = useState(45)
  const [wmType, setWmType] = useState<'text' | 'image'>('text')
  const [wmImage, setWmImage] = useState<File | null>(null)
  const [wmPos, setWmPos] = useState({ x: 0.5, y: 0.5 }) // Normalized 0 to 1
  
  // Advanced Tool states
  const [order, setOrder] = useState('')
  const [removePages, setRemovePages] = useState('')
  const [position, setPosition] = useState('1')
  const [blankCount, setBlankCount] = useState('1')
  const [pageSize, setPageSize] = useState('a4')
  const [margin, setMargin] = useState(24)

  // Navigation states
  const [previewPage, setPreviewPage] = useState(1)
  const [totalPdfPages, setTotalPdfPages] = useState(0)
  const [isMetaLoading, setIsMetaLoading] = useState(false)
  const [sourcePreview, setSourcePreview] = useState<SourcePreview>({ kind: 'empty' })
  const explicitExportPages = React.useMemo(
    () => getExplicitPageNumbers(pages, totalPdfPages),
    [pages, totalPdfPages]
  )

  useEffect(() => {
    setIsProcessing(false)
    setFiles([])
    setPages('')
    setText('PDF Spark')
    setFontSize(48)
    setOpacity(0.3)
    setRotation(45)
    setWmType('text')
    setWmImage(null)
    setWmPos({ x: 0.5, y: 0.5 })
    setOrder('')
    setRemovePages('')
    setPosition('1')
    setBlankCount('1')
    setPageSize('a4')
    setMargin(24)
    setPreviewPage(1)
    setTotalPdfPages(0)
    setIsMetaLoading(false)
    setSourcePreview({ kind: 'empty' })
  }, [toolId])

  useEffect(() => {
    const file = files[0]
    let cancelled = false

    if (!file) {
      setTotalPdfPages(0)
      setPreviewPage(1)
      setIsMetaLoading(false)
      setSourcePreview({ kind: 'empty' })
      return () => {
        cancelled = true
      }
    }

    const loadMeta = async () => {
      setIsMetaLoading(true)
      setPreviewPage(1)
      setSourcePreview({ kind: 'empty' })

      try {
        if (isPdfFile(file)) {
          const buffer = await file.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
          if (cancelled) return
          setTotalPdfPages(pdf.numPages)
          setSourcePreview({ kind: 'pdf' })
          return
        }

        setTotalPdfPages(0)
        const preview = await buildSourcePreview(toolId as GenericToolId, file)
        if (cancelled) return
        setSourcePreview(preview)
      } catch (error: any) {
        if (cancelled) return
        setTotalPdfPages(0)
        setSourcePreview({
          kind: 'error',
          title: file.name,
          message: error?.message || 'Preview could not be generated for this file.'
        })
      } finally {
        if (!cancelled) setIsMetaLoading(false)
      }
    }

    loadMeta()
    return () => {
      cancelled = true
    }
  }, [files, toolId])

  const handleProcess = async (selectedFiles = files) => {
    if (selectedFiles.length === 0) return
    setIsProcessing(true)
    try {
      const file = selectedFiles[0]
      await runTool(toolId as GenericToolId, file, {
        pages, text, fontSize, opacity, rotation, wmType, wmImage, wmPos,
        order, removePages, position, blankCount, pageSize, margin
      })
      toast.success(`${tool.title} completed`)
      
      // Auto-reset state after processing
      setFiles([])
      setPages('')
      setWmImage(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to process PDF")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!tool || !toolId || !CONFIG[toolId]) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-black mb-4">Tool not found</h1>
        <p className="opacity-65 mb-7">This PDF tool is not available in the current toolkit.</p>
        <Link to="/tools" className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-6 font-bold text-white hover:bg-[var(--accent-hover)] transition-colors">
          Browse All Tools
        </Link>
      </div>
    )
  }

  return (
    <ToolLayout
      title={tool.title}
      description={tool.description}
      icon={tool.icon}
      colorClass={tool.color}
      accept={config.accept}
      maxFiles={config.maxFiles}
      multiple={config.maxFiles !== 1}
      onProcess={async (f) => { setFiles(f); await handleProcess(f) }}
      isProcessing={isProcessing}
      buttonText={config.buttonText}
      uploadTitle={config.uploadTitle}
      uploadDescription={config.uploadDescription}
      files={files}
      setFiles={setFiles}
      controls={(f, sf) => {
        return (
          <div className="space-y-8 mt-8">
            <FilePreviewList files={f} onRemove={() => sf([])} />
            
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
              <div className="space-y-6 bg-[var(--surface)]/50 backdrop-blur-md rounded-3xl border border-[var(--border)] p-8 shadow-xl h-fit">
                <ControlPanel
                  toolId={toolId as GenericToolId}
                  state={{ pages, text, fontSize, opacity, rotation, wmType, wmImage, wmPos, order, removePages, position, blankCount, pageSize, margin }}
                  setters={{ setPages, setText, setFontSize, setOpacity, setRotation, setWmType, setWmImage, setWmPos, setOrder, setRemovePages, setPosition, setBlankCount, setPageSize, setMargin }}
                  totalPdfPages={totalPdfPages}
                  previewPage={previewPage}
                  setPreviewPage={setPreviewPage}
                />
              </div>

              {f.length > 0 && (
                <SourcePreviewPanel
                  file={f[0]}
                  toolId={toolId as GenericToolId}
                  preview={sourcePreview}
                  previewPage={previewPage}
                  totalPdfPages={totalPdfPages}
                  isMetaLoading={isMetaLoading}
                  pages={pages}
                  explicitExportPages={explicitExportPages}
                  setPreviewPage={setPreviewPage}
                  state={{ text, fontSize, opacity, rotation, wmType, wmImage, wmPos }}
                  setters={{ setWmPos }}
                />
              )}
            </div>
          </div>
        )
      }}
    />
  )
}

interface SourcePreviewPanelProps {
  file: File
  toolId: GenericToolId
  preview: SourcePreview
  previewPage: number
  totalPdfPages: number
  isMetaLoading: boolean
  pages: string
  explicitExportPages: number[]
  setPreviewPage: React.Dispatch<React.SetStateAction<number>>
  state: any
  setters: any
}

function SourcePreviewPanel({
  file,
  toolId,
  preview,
  previewPage,
  totalPdfPages,
  isMetaLoading,
  pages,
  explicitExportPages,
  setPreviewPage,
  state,
  setters
}: SourcePreviewPanelProps) {
  const isPdfPreview = preview.kind === 'pdf'
  const isWatermark = toolId === 'watermark'
  const title = isWatermark ? 'Placement Preview' : isPdfPreview ? 'Document Preview' : 'Source Preview'
  const status = getPreviewStatus(preview, previewPage, totalPdfPages, isMetaLoading)

  return (
    <div className="bg-[var(--surface)]/50 backdrop-blur-md rounded-3xl border border-[var(--border)] p-10 shadow-xl overflow-hidden flex flex-col items-center">
      <div className="w-full flex items-center justify-between gap-4 mb-8">
        <h3 className="text-xl font-bold flex items-center">
          <Eye className="w-5 h-5 mr-2 text-[var(--accent)]" />
          {title}
        </h3>
        <div className="px-4 py-1.5 bg-white rounded-full border border-[var(--border)] text-[10px] font-black opacity-60 uppercase tracking-widest shadow-sm">
          {status}
        </div>
      </div>

      {isPdfPreview ? (
        <>
          <PdfPreviewSurface
            file={file}
            toolId={toolId}
            previewPage={previewPage}
            state={state}
            setters={setters}
          />

          {totalPdfPages > 1 ? (
            <PdfPreviewPagination
              toolId={toolId}
              pages={pages}
              explicitExportPages={explicitExportPages}
              previewPage={previewPage}
              totalPdfPages={totalPdfPages}
              setPreviewPage={setPreviewPage}
            />
          ) : null}

          <p className="mt-4 text-xs opacity-50 text-center">
            {isWatermark ? 'Preview shows the selected page. Watermark applies to every page.' : 'Live preview of the uploaded PDF.'}
          </p>
        </>
      ) : (
        <>
          <FileSourcePreview preview={preview} isLoading={isMetaLoading} />
          <p className="mt-4 text-xs opacity-50 text-center">
            This preview is generated from the uploaded source file before conversion.
          </p>
        </>
      )}
    </div>
  )
}

function PdfPreviewSurface({ file, toolId, previewPage, state, setters }: any) {
  const [wmImageUrl, setWmImageUrl] = useState('')

  useEffect(() => {
    if (!state.wmImage) {
      setWmImageUrl('')
      return
    }

    const url = URL.createObjectURL(state.wmImage)
    setWmImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [state.wmImage])

  return (
    <div className="relative group w-full flex justify-center transition-all duration-500">
      <div className="relative w-full max-w-[560px] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-gray-200 rounded-lg overflow-hidden transition-all duration-500 hover:shadow-[0_48px_80px_-20px_rgba(0,0,0,0.3)]">
        <PdfPagePreview
          file={file}
          pageNumber={previewPage}
          scale={1.35}
          maxHeight={580}
          className="min-h-[360px]"
        />

        {toolId === 'watermark' ? (
          <>
            <div
              className="absolute pointer-events-none flex items-center justify-center whitespace-nowrap"
              style={{
                left: `${state.wmPos.x * 100}%`,
                top: `${state.wmPos.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${-state.rotation}deg)`,
                opacity: state.opacity
              }}
            >
              {state.wmType === 'text' ? (
                <span
                  style={{ fontSize: `${Math.min(state.fontSize, 86)}px` }}
                  className="font-bold text-[var(--accent)] border-4 border-[var(--accent)] px-4 py-2 rounded-lg bg-white/40"
                >
                  {state.text || 'Watermark'}
                </span>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-[var(--accent)] flex items-center justify-center bg-red-50/60">
                  {wmImageUrl ? (
                    <img src={wmImageUrl} className="max-w-full max-h-full" alt="" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-red-300" />
                  )}
                </div>
              )}
            </div>

            <div
              className="absolute inset-0 cursor-crosshair"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                setters.setWmPos({
                  x: (event.clientX - rect.left) / rect.width,
                  y: (event.clientY - rect.top) / rect.height
                })
              }}
            />
            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Click to position
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function PdfPreviewPagination({
  toolId,
  pages,
  explicitExportPages,
  previewPage,
  totalPdfPages,
  setPreviewPage
}: {
  toolId: GenericToolId
  pages: string
  explicitExportPages: number[]
  previewPage: number
  totalPdfPages: number
  setPreviewPage: React.Dispatch<React.SetStateAction<number>>
}) {
  return (
    <div className="w-full mt-10 space-y-6">
      <div className="flex flex-wrap justify-center gap-2 max-w-full overflow-x-auto py-2 px-4 no-scrollbar">
        {Array.from({ length: totalPdfPages }).map((_, index) => {
          const pageNumber = index + 1
          const selectedForExport = toolId === 'pdf-to-image' && (
            pages.trim() === '' || explicitExportPages.includes(pageNumber)
          )

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPreviewPage(pageNumber)}
              className={`relative h-9 min-w-9 rounded-xl border px-3 text-xs font-black transition-all ${
                previewPage === pageNumber
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-red-900/10'
                  : 'border-[var(--border)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)]'
              }`}
              title={`Preview page ${pageNumber}`}
            >
              {pageNumber}
              {selectedForExport ? (
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-[var(--accent)] ring-2 ring-white" />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 bg-[var(--background)]/50 border border-[var(--border)] rounded-2xl p-4 backdrop-blur-sm shadow-inner">
        <button
          type="button"
          onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
          disabled={previewPage === 1}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white hover:shadow-md disabled:opacity-20 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Document Navigation</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={previewPage}
              onChange={(event) => {
                const value = parseInt(event.target.value)
                if (value >= 1 && value <= totalPdfPages) setPreviewPage(value)
              }}
              className="w-12 bg-white border border-[var(--border)] rounded-lg py-1 text-center font-bold text-sm shadow-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
            />
            <span className="text-sm font-bold opacity-40">/ {totalPdfPages}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPreviewPage((page) => Math.min(totalPdfPages, page + 1))}
          disabled={previewPage === totalPdfPages}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white hover:shadow-md disabled:opacity-20 transition-all"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function FileSourcePreview({ preview, isLoading }: { preview: SourcePreview; isLoading: boolean }) {
  if (isLoading || preview.kind === 'empty') {
    return (
      <div className="w-full rounded-2xl border border-[var(--border)] bg-white p-8 min-h-[420px] flex items-center justify-center shadow-inner">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-10 w-10 rounded-2xl bg-[var(--accent-soft)] animate-pulse" />
          <p className="text-sm font-bold opacity-60">Analyzing source file...</p>
        </div>
      </div>
    )
  }

  if (preview.kind === 'error') {
    return (
      <div className="w-full rounded-2xl border border-[var(--border)] bg-white p-8 min-h-[420px] flex items-center justify-center shadow-inner">
        <div className="max-w-md text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-[var(--accent)]" />
          <h4 className="text-lg font-black">{preview.title}</h4>
          <p className="mt-3 text-sm leading-6 opacity-60">{preview.message}</p>
        </div>
      </div>
    )
  }

  if (preview.kind === 'table') {
    const rows = preview.rows.slice(0, 32)
    const columnCount = Math.min(
      8,
      Math.max(1, ...preview.rows.map((row) => row.length))
    )

    return (
      <div className="w-full rounded-2xl border border-[var(--border)] bg-white p-6 min-h-[420px] max-h-[620px] overflow-auto shadow-inner">
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Table2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-base font-black">{preview.title}</h4>
            <p className="text-xs font-semibold opacity-50">{preview.meta}</p>
          </div>
        </div>

        {rows.length ? (
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-t border-[var(--border)]'}>
                  {Array.from({ length: columnCount }).map((_, columnIndex) => (
                    <td key={columnIndex} className="max-w-[180px] px-3 py-2 font-semibold align-top">
                      <span className="line-clamp-2 break-words">{row[columnIndex] || ''}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm opacity-55">No readable spreadsheet rows found.</p>
        )}
      </div>
    )
  }

  if (preview.kind !== 'text') {
    return null
  }

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-white p-6 min-h-[420px] max-h-[620px] overflow-auto shadow-inner">
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--border)] pb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-base font-black">{preview.title}</h4>
          <p className="text-xs font-semibold opacity-50">{preview.meta}</p>
        </div>
      </div>

      <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 font-sans">
        {preview.text || 'No readable text found in this file.'}
      </pre>
    </div>
  )
}

function getPreviewStatus(preview: SourcePreview, previewPage: number, totalPdfPages: number, isLoading: boolean) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
        Analyzing...
      </span>
    )
  }

  if (preview.kind === 'pdf' && totalPdfPages > 0) return `Page ${previewPage} of ${totalPdfPages}`
  if (preview.kind === 'table') return 'Table Preview'
  if (preview.kind === 'text') return 'Text Preview'
  if (preview.kind === 'error') return 'Preview Issue'
  return 'Ready'
}

function ControlPanel({ toolId, state, setters, totalPdfPages, previewPage, setPreviewPage }: any) {
  if (toolId === 'watermark') {
    return (
      <div className="space-y-6">
        <div className="flex bg-[var(--background)] p-1.5 rounded-2xl border border-[var(--border)]">
          <button 
            onClick={() => setters.setWmType('text')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${state.wmType === 'text' ? 'bg-[var(--accent)] text-white shadow-lg' : 'hover:bg-[var(--surface-hover)]'}`}
          >
            <Type className="w-4 h-4 mr-2" /> Text
          </button>
          <button 
            onClick={() => setters.setWmType('image')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${state.wmType === 'image' ? 'bg-[var(--accent)] text-white shadow-lg' : 'hover:bg-[var(--surface-hover)]'}`}
          >
            <ImageIcon className="w-4 h-4 mr-2" /> Image
          </button>
        </div>

        {state.wmType === 'text' ? (
          <div>
            <label className="block text-sm font-bold mb-3 uppercase tracking-wider opacity-60">Watermark Text</label>
            <textarea
              value={state.text}
              onChange={(e) => setters.setText(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 focus:ring-2 focus:ring-[var(--accent)] outline-none min-h-[100px] text-lg transition-all"
              placeholder="e.g. CONFIDENTIAL"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-bold mb-3 uppercase tracking-wider opacity-60">Watermark Image</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setters.setWmImage(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)] file:cursor-pointer cursor-pointer bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold opacity-60 uppercase tracking-wider">Opacity ({Math.round(state.opacity * 100)}%)</label>
            <input type="range" min="0" max="1" step="0.05" value={state.opacity} onChange={(e) => setters.setOpacity(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold opacity-60 uppercase tracking-wider">Rotation ({state.rotation} deg)</label>
            <input type="range" min="-180" max="180" step="5" value={state.rotation} onChange={(e) => setters.setRotation(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </div>
        </div>

        {state.wmType === 'text' && (
           <div className="space-y-2">
            <label className="block text-sm font-bold opacity-60 uppercase tracking-wider">Text Size ({state.fontSize}px)</label>
            <input type="range" min="8" max="200" step="2" value={state.fontSize} onChange={(e) => setters.setFontSize(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </div>
        )}

        <div className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
           <p className="text-xs font-bold opacity-40 uppercase tracking-widest flex items-center mb-4">
             <Move className="w-3 h-3 mr-2" /> Precise Positioning
           </p>
           <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] uppercase font-black opacity-30">X-Pos</span>
                <input type="number" step="0.01" value={state.wmPos.x} onChange={e => setters.setWmPos({...state.wmPos, x: Number(e.target.value)})} className="w-full bg-[var(--surface)] p-2 rounded-lg text-sm border border-[var(--border)]" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] uppercase font-black opacity-30">Y-Pos</span>
                <input type="number" step="0.01" value={state.wmPos.y} onChange={e => setters.setWmPos({...state.wmPos, y: Number(e.target.value)})} className="w-full bg-[var(--surface)] p-2 rounded-lg text-sm border border-[var(--border)]" />
              </div>
           </div>
        </div>
      </div>
    )
  }

  const pageSelectionTools = ['delete-pages', 'extract-pages', 'duplicate-pages', 'pdf-to-image', 'highlight-text']
  const textTools = ['digital-signature', 'watermark', 'add-notes', 'fill-forms', 'edit-text']
  const marginTools = ['crop-pdf']
  const orderTools = ['reorder-pages', 'organize-pdf']
  const blankTools = ['insert-blank-page']

  if (toolId === 'pdf-to-image') {
    return (
      <PdfToImageControls
        pages={state.pages}
        setPages={setters.setPages}
        totalPdfPages={totalPdfPages}
        previewPage={previewPage}
        setPreviewPage={setPreviewPage}
      />
    )
  }

  return (
    <div className="space-y-6">
      {pageSelectionTools.includes(toolId) ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold opacity-60 uppercase tracking-widest">Select Pages</label>
            {totalPdfPages > 0 && (
              <span className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-black rounded-md">
                {totalPdfPages} PAGES FOUND
              </span>
            )}
          </div>
          <input
            value={state.pages}
            onChange={e => setters.setPages(e.target.value)}
            placeholder="e.g. 1, 3-5 (Leave blank for all)"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
          />
          <p className="text-[10px] opacity-40 font-medium leading-relaxed">
            Specify page numbers separated by commas, or use ranges like 1-5. Leave empty to process the entire document.
          </p>
        </div>
      ) : null}

      {orderTools.includes(toolId) ? (
        <div>
          <label className="block text-sm font-bold mb-2 opacity-60 uppercase tracking-widest">Page Order</label>
          <input
            value={state.order}
            onChange={e => setters.setOrder(e.target.value)}
            placeholder="e.g. 3, 1, 2-5"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
          />
          {toolId === 'organize-pdf' ? (
            <input
              value={state.removePages}
              onChange={e => setters.setRemovePages(e.target.value)}
              placeholder="Remove pages, e.g. 8, 10-12"
              className="mt-3 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
            />
          ) : null}
        </div>
      ) : null}

      {blankTools.includes(toolId) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold mb-2 opacity-60 uppercase tracking-widest">Position</label>
            <input
              type="number"
              min="1"
              value={state.position}
              onChange={e => setters.setPosition(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 opacity-60 uppercase tracking-widest">Count</label>
            <input
              type="number"
              min="1"
              max="20"
              value={state.blankCount}
              onChange={e => setters.setBlankCount(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 opacity-60 uppercase tracking-widest">Size</label>
            <select
              value={state.pageSize}
              onChange={e => setters.setPageSize(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
            >
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </div>
        </div>
      ) : null}

      {marginTools.includes(toolId) ? (
        <div>
          <label className="block text-sm font-bold mb-2 opacity-60 uppercase tracking-widest">Crop Margin ({state.margin} pt)</label>
          <input
            type="range"
            min="0"
            max="96"
            step="6"
            value={state.margin}
            onChange={e => setters.setMargin(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      ) : null}

      {textTools.includes(toolId) ? (
        <div>
          <label className="block text-sm font-bold mb-2 opacity-60 uppercase tracking-widest">Text</label>
          <textarea
            value={state.text}
            onChange={(e) => setters.setText(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 focus:ring-2 focus:ring-[var(--accent)] outline-none min-h-[110px] text-base transition-all"
            placeholder="Type the text to apply"
          />
        </div>
      ) : null}

      {!pageSelectionTools.includes(toolId) && !textTools.includes(toolId) && !marginTools.includes(toolId) && !orderTools.includes(toolId) && !blankTools.includes(toolId) ? (
        <p className="text-sm opacity-55">This tool will process the uploaded file with the default professional settings.</p>
      ) : null}
    </div>
  )
}

interface PdfToImageControlsProps {
  pages: string
  setPages: (value: string) => void
  totalPdfPages: number
  previewPage: number
  setPreviewPage: (value: number) => void
}

function PdfToImageControls({
  pages,
  setPages,
  totalPdfPages,
  previewPage,
  setPreviewPage
}: PdfToImageControlsProps) {
  const explicitPages = getExplicitPageNumbers(pages, totalPdfPages)
  const isAllPages = pages.trim() === ''
  const selectedCount = isAllPages ? totalPdfPages : explicitPages.length

  const selectCurrentPage = () => {
    setPages(String(previewPage))
  }

  const togglePage = (pageNumber: number) => {
    setPreviewPage(pageNumber)
    const next = new Set(isAllPages ? [] : explicitPages)

    if (next.has(pageNumber)) {
      next.delete(pageNumber)
    } else {
      next.add(pageNumber)
    }

    setPages(formatPageNumbers(Array.from(next)))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-bold opacity-60 uppercase tracking-widest">Export Pages</label>
          {totalPdfPages > 0 ? (
            <span className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-black rounded-md">
              {selectedCount || 0} / {totalPdfPages}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPages('')}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
              isAllPages
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            All Pages
          </button>
          <button
            type="button"
            onClick={selectCurrentPage}
            disabled={!totalPdfPages}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-bold hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-colors"
          >
            Current Page
          </button>
          <button
            type="button"
            onClick={() => setPages('')}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-bold hover:bg-[var(--surface-hover)] transition-colors"
          >
            Reset
          </button>
        </div>

        <input
          value={pages}
          onChange={e => setPages(e.target.value)}
          placeholder="Leave blank for all, or e.g. 1, 3-5"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--accent)] outline-none"
        />
        <p className="text-[10px] opacity-45 font-medium leading-relaxed">
          Blank means every page. Use page buttons below for quick selection, or type ranges manually.
        </p>
      </div>

      {totalPdfPages > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest opacity-45">Page Selector</span>
            <span className="text-xs font-bold text-[var(--accent)]">
              {isAllPages ? 'All pages selected' : `${explicitPages.length} selected`}
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
            {Array.from({ length: totalPdfPages }).map((_, index) => {
              const pageNumber = index + 1
              const selected = !isAllPages && explicitPages.includes(pageNumber)
              const activePreview = previewPage === pageNumber

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => togglePage(pageNumber)}
                  className={`relative h-11 rounded-xl border text-sm font-black transition-all ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-red-900/10'
                      : activePreview
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                  }`}
                  title={`Select page ${pageNumber}`}
                >
                  {pageNumber}
                  {selected ? (
                    <Check className="absolute right-1 top-1 h-3.5 w-3.5" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm opacity-60">
          Upload a PDF to load page count and page selection.
        </div>
      )}
    </div>
  )
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

async function buildSourcePreview(toolId: GenericToolId | undefined, file: File): Promise<SourcePreview> {
  const title = baseName(file)
  const meta = formatSourceMeta(file)

  if (toolId === 'excel-to-pdf') {
    const rows = await officeFileToRows(file)
    return {
      kind: 'table',
      title,
      rows,
      meta: rows.length ? `${rows.length} rows - ${meta}` : meta
    }
  }

  let text = ''
  if (toolId === 'html-to-pdf') {
    text = stripHtml(await fileToText(file))
  } else if (toolId === 'text-to-pdf') {
    text = await fileToText(file)
  } else if (toolId === 'word-to-pdf' || toolId === 'powerpoint-to-pdf') {
    text = await officeFileToText(file)
  } else {
    text = await fileToText(file)
  }

  return {
    kind: 'text',
    title,
    text: text.trim(),
    meta
  }
}

function formatSourceMeta(file: File) {
  const extension = file.name.match(/\.([^.]+)$/)?.[1]?.toUpperCase() || 'FILE'
  return `${extension} - ${formatBytes(file.size)}`
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** index)
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

async function runTool(toolId: GenericToolId, file: File, state: any) {
  const name = baseName(file)

  if (toolId === 'word-to-pdf' || toolId === 'powerpoint-to-pdf') {
    const text = await officeFileToText(file)
    return createPdfFromText(name, text || 'No readable text was found in this file.', `${name}.pdf`)
  }

  if (toolId === 'excel-to-pdf') {
    const rows = await officeFileToRows(file)
    const text = rows.map((row) => row.join('    ')).join('\n')
    return createPdfFromText(name, text || 'No readable spreadsheet data was found.', `${name}.pdf`)
  }

  if (toolId === 'text-to-pdf') {
    return createPdfFromText(name, await fileToText(file), `${name}.pdf`)
  }

  if (toolId === 'html-to-pdf') {
    return createPdfFromText(name, stripHtml(await fileToText(file)), `${name}.pdf`)
  }

  if (toolId === 'pdf-to-image') {
    return renderPdfPagesToPng(file, state.pages)
  }

  if (toolId === 'pdf-to-text') {
    const text = await extractPdfText(file)
    return downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${name}.txt`)
  }

  if (toolId === 'pdf-to-word') {
    const text = await extractPdfText(file)
    return downloadOfficeHtml(`${name}.doc`, name, text, 'application/msword')
  }

  if (toolId === 'pdf-to-powerpoint') {
    const text = await extractPdfText(file)
    return downloadOfficeHtml(`${name}.ppt`, name, text, 'application/vnd.ms-powerpoint')
  }

  if (toolId === 'pdf-to-excel') {
    const text = await extractPdfText(file)
    const csv = text.split(/\n+/).map((line) => `"${line.replace(/"/g, '""')}"`).join('\n')
    return downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
  }

  const pdf = await loadPdf(file)
  const total = pdf.getPageCount()
  const getPages = (input = state.pages, fallbackAll = true) => uniqueSorted(parsePageSelection(input, total, fallbackAll))

  if (toolId === 'watermark') {
    const pages = pdf.getPages()
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    
    let wmImgObj: any = null
    if (state.wmType === 'image' && state.wmImage) {
      const imgBuffer = await state.wmImage.arrayBuffer()
      wmImgObj = state.wmImage.type.includes('png') ? await pdf.embedPng(imgBuffer) : await pdf.embedJpg(imgBuffer)
    }

    pages.forEach(page => {
      const { width, height } = page.getSize()
      const x = width * state.wmPos.x
      const y = height * (1 - state.wmPos.y) // pdf-lib uses bottom-left origin

      if (state.wmType === 'text') {
        page.drawText(safePdfText(state.text || 'Watermark'), {
          x, y,
          size: state.fontSize,
          font,
          rotate: degrees(state.rotation),
          opacity: state.opacity,
          color: rgb(0.9, 0, 0) // Branding Red
        })
      } else if (wmImgObj) {
        const dims = wmImgObj.scale(0.5)
        page.drawImage(wmImgObj, {
          x: x - dims.width / 2,
          y: y - dims.height / 2,
          width: dims.width,
          height: dims.height,
          rotate: degrees(state.rotation),
          opacity: state.opacity
        })
      }
    })
    return savePdf(pdf, `${name}-watermarked.pdf`)
  }

  if (toolId === 'delete-pages') {
    const selected = getPages(state.pages, false)
    if (!selected.length) throw new Error('Select at least one page to delete.')
    selected.reverse().forEach(i => pdf.removePage(i))
    return savePdf(pdf, `${name}-pages-removed.pdf`)
  }

  if (toolId === 'extract-pages') {
    const selected = getPages(state.pages, false)
    if (!selected.length) throw new Error('Select at least one page to extract.')
    const out = await PDFDocument.create()
    const copied = await out.copyPages(pdf, selected)
    copied.forEach((page) => out.addPage(page))
    return savePdf(out, `${name}-extracted.pdf`)
  }

  if (toolId === 'duplicate-pages') {
    const selected = getPages(state.pages, true)
    const copied = await pdf.copyPages(pdf, selected)
    copied.forEach((page) => pdf.addPage(page))
    return savePdf(pdf, `${name}-duplicated.pdf`)
  }

  if (toolId === 'reorder-pages') {
    const order = parsePageSelection(state.order, total, true)
    const out = await PDFDocument.create()
    const copied = await out.copyPages(pdf, order)
    copied.forEach((page) => out.addPage(page))
    return savePdf(out, `${name}-reordered.pdf`)
  }

  if (toolId === 'organize-pdf') {
    const removed = new Set(parsePageSelection(state.removePages, total, false))
    const order = parsePageSelection(state.order, total, true).filter((index) => !removed.has(index))
    const out = await PDFDocument.create()
    const copied = await out.copyPages(pdf, order)
    copied.forEach((page) => out.addPage(page))
    return savePdf(out, `${name}-organized.pdf`)
  }

  if (toolId === 'insert-blank-page') {
    const count = Math.min(Math.max(Number(state.blankCount) || 1, 1), 20)
    const position = Math.min(Math.max((Number(state.position) || 1) - 1, 0), total)
    const size = pageSizeFromName(state.pageSize)
    for (let index = 0; index < count; index += 1) {
      pdf.insertPage(position + index, size)
    }
    return savePdf(pdf, `${name}-blank-pages.pdf`)
  }

  if (toolId === 'crop-pdf') {
    const margin = Math.max(Number(state.margin) || 0, 0)
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize()
      if (margin * 2 >= width || margin * 2 >= height) return
      page.setCropBox(margin, margin, width - margin * 2, height - margin * 2)
    })
    return savePdf(pdf, `${name}-cropped.pdf`)
  }

  if (toolId === 'remove-restrictions') {
    return savePdf(pdf, `${name}-unrestricted.pdf`)
  }

  if (toolId === 'page-numbers') {
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    pdf.getPages().forEach((page, index) => {
      drawCenteredText(page, `${index + 1}`, font, 11, 28)
    })
    return savePdf(pdf, `${name}-numbered.pdf`)
  }

  if (toolId === 'digital-signature') {
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    const text = safePdfText(state.text || 'Signed with PDF Spark')
    const pages = pdf.getPages()
    const page = pages[pages.length - 1]
    page.drawText(text, {
      x: 48,
      y: 54,
      size: 16,
      font,
      color: rgb(0.12, 0.12, 0.12)
    })
    page.drawLine({
      start: { x: 48, y: 48 },
      end: { x: 270, y: 48 },
      thickness: 1,
      color: rgb(0.15, 0.15, 0.15)
    })
    return savePdf(pdf, `${name}-signed.pdf`)
  }

  if (toolId === 'highlight-text') {
    const selected = getPages(state.pages, true)
    selected.forEach((index) => {
      const page = pdf.getPage(index)
      const { width, height } = page.getSize()
      page.drawRectangle({
        x: 48,
        y: height * 0.55,
        width: width - 96,
        height: 34,
        color: rgb(1, 0.92, 0.2),
        opacity: 0.45
      })
    })
    return savePdf(pdf, `${name}-highlighted.pdf`)
  }

  if (toolId === 'add-notes') {
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const note = safePdfText(state.text || 'Note')
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize()
      page.drawRectangle({
        x: width - 230,
        y: height - 148,
        width: 180,
        height: 78,
        color: rgb(1, 0.96, 0.72),
        borderColor: rgb(0.86, 0.62, 0.12),
        borderWidth: 1,
        opacity: 0.95
      })
      wrapText(note, font, 10, 156).slice(0, 4).forEach((line, lineIndex) => {
        page.drawText(line, {
          x: width - 216,
          y: height - 94 - lineIndex * 14,
          size: 10,
          font,
          color: rgb(0.17, 0.13, 0.08)
        })
      })
    })
    return savePdf(pdf, `${name}-notes.pdf`)
  }

  if (toolId === 'draw-on-pdf') {
    pdf.getPages().forEach((page) => {
      const { width } = page.getSize()
      page.drawLine({
        start: { x: 52, y: 96 },
        end: { x: width - 52, y: 148 },
        thickness: 4,
        color: rgb(0.9, 0.03, 0.08),
        opacity: 0.85
      })
    })
    return savePdf(pdf, `${name}-drawn.pdf`)
  }

  if (toolId === 'add-shapes') {
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize()
      page.drawRectangle({
        x: 48,
        y: height - 150,
        width: 120,
        height: 72,
        borderColor: rgb(0.9, 0.03, 0.08),
        borderWidth: 3
      })
      page.drawEllipse({
        x: width - 118,
        y: height - 115,
        xScale: 36,
        yScale: 36,
        borderColor: rgb(0.9, 0.03, 0.08),
        borderWidth: 3
      })
    })
    return savePdf(pdf, `${name}-shapes.pdf`)
  }

  if (toolId === 'fill-forms') {
    const form = pdf.getForm()
    const fields = form.getFields()
    let filled = 0
    fields.forEach((field) => {
      const textField = field as any
      if (typeof textField.setText === 'function') {
        textField.setText(safePdfText(state.text || 'PDF Spark'))
        filled += 1
      }
    })

    if (!filled) {
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)
      pdf.getPages()[0].drawText(safePdfText(state.text || 'PDF Spark'), {
        x: 48,
        y: 72,
        size: 14,
        font,
        color: rgb(0.1, 0.1, 0.1)
      })
    }
    return savePdf(pdf, `${name}-filled.pdf`)
  }

  if (toolId === 'edit-text') {
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    pdf.getPages().forEach((page) => {
      const { height } = page.getSize()
      page.drawRectangle({
        x: 48,
        y: height - 150,
        width: 280,
        height: 46,
        color: rgb(1, 1, 1)
      })
      page.drawText(safePdfText(state.text || 'Edited with PDF Spark'), {
        x: 56,
        y: height - 132,
        size: 14,
        font,
        color: rgb(0.08, 0.08, 0.08)
      })
    })
    return savePdf(pdf, `${name}-edited.pdf`)
  }

  return savePdf(pdf, `${name}-processed.pdf`)
}

function downloadOfficeHtml(filename: string, title: string, text: string, type: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre></body></html>`
  downloadBlob(new Blob([html], { type: `${type};charset=utf-8` }), filename)
}

function getExplicitPageNumbers(input: string, total: number) {
  if (!total || !input.trim()) return []

  try {
    return uniqueSorted(parsePageSelection(input, total, false)).map((index) => index + 1)
  } catch {
    return []
  }
}

function formatPageNumbers(numbers: number[]) {
  return Array.from(new Set(numbers))
    .sort((a, b) => a - b)
    .join(', ')
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
