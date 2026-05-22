import React, { useState } from 'react'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { getToolById } from '../../lib/toolsData'
import toast from 'react-hot-toast'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { downloadBytes, baseName } from '../../lib/pdfToolHelpers'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export function UnlockTool() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [password, setPassword] = useState('')
  const toolMeta = getToolById('unlock')!

  const processUnlock = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const data = new Uint8Array(arrayBuffer)

      // Step 1: Load encrypted PDF with pdfjs-dist (supports password decryption)
      let pdfJsDoc: pdfjsLib.PDFDocumentProxy
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: data.slice(),
          password: password || undefined,
        })
        pdfJsDoc = await loadingTask.promise
      } catch (err: any) {
        if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
          throw new Error('Incorrect password. Please enter the correct PDF password.')
        }
        throw new Error('Could not open this PDF. It may be corrupted or use unsupported encryption.')
      }

      // Step 2: Render each page to canvas and embed into a new clean pdf-lib PDF
      const newPdf = await PDFDocument.create()
      const scale = 2.0 // Higher scale = better quality

      for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
        const page = await pdfJsDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale, rotation: page.rotate })

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!

        await page.render({ canvasContext: ctx, viewport }).promise

        // Convert canvas to PNG bytes
        const pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Canvas render failed'))),
            'image/png'
          )
        })
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())

        // Embed PNG into pdf-lib and add as page
        const pngImage = await newPdf.embedPng(pngBytes)
        const pdfPage = newPdf.addPage([viewport.width / scale, viewport.height / scale])
        pdfPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: viewport.width / scale,
          height: viewport.height / scale,
        })

        // Clean up
        canvas.width = 0
        canvas.height = 0
      }

      // Step 3: Save as a completely new, unprotected PDF
      const unlockedBytes = await newPdf.save({ useObjectStreams: true })
      downloadBytes(unlockedBytes, `unlocked_${baseName(file)}.pdf`)
      toast.success(`PDF unlocked successfully! (${pdfJsDoc.numPages} pages)`)
    } catch (error: any) {
      console.error('Unlock error:', error)
      throw new Error(error.message || 'Failed to unlock PDF. Please check the password and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    return (
      <div className="mt-8 space-y-6">
        <FilePreviewList files={files} onRemove={() => setFiles([])} />

        <div className="bg-[var(--background)] rounded-2xl p-6 border border-[var(--border)] max-w-sm mx-auto shadow-xl">
          <label className="block text-sm font-semibold mb-2">Password (if required)</label>
          <input
            type="password"
            placeholder="Enter PDF password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
          />
          <p className="text-xs opacity-60 mt-3">
            Enter the PDF open-password to unlock it. The output will be a clean, password-free PDF.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove PDF password security and permissions effortlessly."
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      onProcess={processUnlock}
      maxFiles={1}
      buttonText="Unlock PDF"
      isProcessing={isProcessing}
      controls={controls}
    />
  )
}

