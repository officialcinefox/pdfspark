import React, { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { getToolById } from '../../lib/toolsData'
import toast from 'react-hot-toast'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { downloadBytes } from '../../lib/pdfToolHelpers'

interface SplitControlsProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  startPage: string;
  endPage: string;
  maxPages: number;
  setStartPage: React.Dispatch<React.SetStateAction<string>>;
  setEndPage: React.Dispatch<React.SetStateAction<string>>;
  setMaxPages: React.Dispatch<React.SetStateAction<number>>;
}

function SplitControls({
  files,
  setFiles,
  startPage,
  endPage,
  maxPages,
  setStartPage,
  setEndPage,
  setMaxPages
}: SplitControlsProps) {
  React.useEffect(() => {
    if (!files[0]) return

    let cancelled = false

    files[0].arrayBuffer()
      .then(buffer => PDFDocument.load(buffer))
      .then(pdf => {
        if (cancelled) return
        const count = pdf.getPageCount()
        setMaxPages(count)
        setStartPage('1')
        setEndPage(String(count))
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not read PDF page count")
        }
      })

    return () => {
      cancelled = true
    }
  }, [files, setEndPage, setMaxPages, setStartPage])

  return (
    <div className="mt-8 space-y-6">
      <FilePreviewList files={files} onRemove={() => setFiles([])} />
      
      <div className="bg-[var(--background)] rounded-2xl p-6 border border-[var(--border)]">
        <h3 className="font-semibold mb-4">Extract Pages</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm opacity-70 mb-2">From Page</label>
            <input 
              type="number" 
              min="1" 
              max={maxPages} 
              value={startPage} 
              onChange={(e) => setStartPage(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="text-2xl mt-6 opacity-40">-</div>
          <div className="flex-1">
            <label className="block text-sm opacity-70 mb-2">To Page</label>
            <input 
              type="number" 
              min="1" 
              max={maxPages} 
              value={endPage} 
              onChange={(e) => setEndPage(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <p className="text-sm opacity-60 mt-4">Total pages available: {maxPages}</p>
      </div>
    </div>
  )
}

export function SplitTool() {
  const [isProcessing, setIsProcessing] = useState(false)
  const toolMeta = getToolById('split')!
  
  // Custom controls state
  const [startPage, setStartPage] = useState<string>("1")
  const [endPage, setEndPage] = useState<string>("1")
  const [maxPages, setMaxPages] = useState<number>(1)

  const processSplit = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      
      const total = pdf.getPageCount()
      const start = parseInt(startPage) || 1
      const end = parseInt(endPage) || 1
      
      if (start < 1 || end > total || start > end) {
        throw new Error(`Invalid range. Please select between 1 and ${total}`)
      }

      const splitPdf = await PDFDocument.create()
      const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i)
      const copiedPages = await splitPdf.copyPages(pdf, indices)
      copiedPages.forEach((page) => splitPdf.addPage(page))

      const pdfBytes = await splitPdf.save()
      downloadBytes(pdfBytes, `extracted_${start}-${end}_${file.name}`)
      
      toast.success("Pages extracted successfully!")
    } catch (error: any) {
      console.error(error)
      throw new Error(error.message || "Failed to split. Please check your file.")
    } finally {
      setIsProcessing(false)
    }
  }

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    return (
      <SplitControls
        files={files}
        setFiles={setFiles}
        startPage={startPage}
        endPage={endPage}
        maxPages={maxPages}
        setStartPage={setStartPage}
        setEndPage={setEndPage}
        setMaxPages={setMaxPages}
      />
    )
  }

  return (
    <ToolLayout
      title="Split PDF"
      description="Extract a specific range of pages from your PDF file instantly."
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      onProcess={processSplit}
      maxFiles={1}
      buttonText="Extract Range"
      isProcessing={isProcessing}
      controls={controls}
    />
  )
}
