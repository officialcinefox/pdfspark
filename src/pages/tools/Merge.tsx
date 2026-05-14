import React from 'react'
import { PDFDocument } from 'pdf-lib'
import { GripVertical, File, Plus, X } from 'lucide-react'
import { Reorder, AnimatePresence } from 'motion/react'
import { formatBytes } from '../../lib/utils'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { Button } from '../../components/ui/Button'
import { getToolById } from '../../lib/toolsData'
import { PdfPagePreview } from '../../components/ui/PdfPagePreview'
import { downloadBytes } from '../../lib/pdfToolHelpers'
import toast from 'react-hot-toast'

interface FileItem {
  id: string;
  file: File;
}

interface MergeControlsProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

function MergeControls({ files, setFiles }: MergeControlsProps) {
  const [items, setItems] = React.useState<FileItem[]>(() => 
    files.map(file => ({ id: generateId(), file }))
  )
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setItems(prevItems => {
      // Keep stable IDs for existing files, generate new ones for added files
      return files.map(file => {
        const existing = prevItems.find(i => i.file === file)
        return existing || { id: generateId(), file }
      })
    })
  }, [files])

  const handleAddFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected: File[] = event.currentTarget.files ? Array.from(event.currentTarget.files) : []
    const pdfs = selected.filter((file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))

    if (pdfs.length !== selected.length) {
      toast.error('Only PDF files can be added to Merge PDF.')
    }

    if (pdfs.length > 0) {
      setFiles((current) => [...current, ...pdfs])
    }

    event.target.value = ''
  }

  return (
    <div className="mt-8">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest opacity-60">Merge Order</h3>
          <p className="mt-1 text-sm opacity-60">
            {items.length} PDFs selected. Add more PDFs or drag items to correct the order.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={handleAddFiles}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 gap-2 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          <Plus className="h-4 w-4" />
          Add PDFs
        </Button>
      </div>
      <Reorder.Group axis="y" values={items} onReorder={(newItems) => {
        setItems(newItems)
        setFiles(newItems.map(item => item.file))
      }} className="flex flex-col gap-3 relative w-full">
        <AnimatePresence>
          {items.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between p-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] rounded-2xl border border-[var(--border)] shadow-sm cursor-grab active:cursor-grabbing group transition-colors relative w-full"
            >
              <div className="flex items-center space-x-4 overflow-hidden w-full">
                <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="h-16 w-12 bg-white rounded shadow-sm border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                   <PdfPagePreview file={item.file} className="w-full h-full object-cover" />
                </div>
                <div className="truncate">
                  <p className="font-medium truncate text-sm">{item.file.name}</p>
                  <p className="text-xs opacity-60">{formatBytes(item.file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const newItems = items.filter(i => i.id !== item.id)
                  setItems(newItems)
                  setFiles(newItems.map(i => i.file))
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors shrink-0 cursor-pointer"
                aria-label="Remove file"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <X className="w-5 h-5" />
              </button>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  )
}

export function MergeTool() {
  const [isProcessing, setIsProcessing] = React.useState(false)
  const toolMeta = getToolById('merge')!

  const processMerge = async (files: File[]) => {
    if (files.length < 2) {
      toast.error('Add at least two PDFs to merge.')
      return
    }

    setIsProcessing(true)
    try {
      const mergedPdf = await PDFDocument.create()

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      }

      const pdfBytes = await mergedPdf.save()
      downloadBytes(pdfBytes, 'merged-pdfspark.pdf')
      
      toast.success("PDFs merged successfully!")
    } catch (error) {
      console.error(error)
      throw new Error("Failed to merge. Please check your files.")
    } finally {
      setIsProcessing(false)
    }
  }

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    return <MergeControls files={files} setFiles={setFiles} />
  }

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine PDFs in the order you want with the easiest PDF merger available."
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      onProcess={processMerge}
      buttonText="Merge PDF"
      isProcessing={isProcessing}
      multiple={true}
      controls={controls}
    />
  )
}
