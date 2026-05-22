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

      // ── Path 1: Try pdf-lib directly with password (100% quality, no re-render) ──
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, {
          password: password || undefined,
          ignoreEncryption: false,
        } as any)
        // If we reach here, pdf-lib decrypted it — save without any encryption
        const savedBytes = await pdfDoc.save({ useObjectStreams: true })
        downloadBytes(savedBytes, `unlocked_${baseName(file)}.pdf`)
        toast.success(`PDF unlocked at original quality! (${pdfDoc.getPageCount()} pages)`)
        return
      } catch (pdfLibErr: any) {
        // pdf-lib failed (likely AES-256) — fall through to pdfjs canvas path
        const msg = pdfLibErr?.message ?? ''
        if (msg.toLowerCase().includes('incorrect password') || msg.includes('Invalid password')) {
          throw new Error('Incorrect password. Please enter the correct PDF password.')
        }
        // Otherwise continue to canvas fallback
      }

      // ── Path 2: pdfjs-dist + canvas re-render (for AES-256 encrypted PDFs) ──
      const data = new Uint8Array(arrayBuffer)
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
        throw new Error('Could not open this PDF. It may be corrupted or use an unsupported encryption type.')
      }

      // Render at 3× scale for sharp text and crisp graphics
      const SCALE = 3
      const newPdf = await PDFDocument.create()

      for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
        const page = await pdfJsDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: SCALE, rotation: page.rotate })

        const canvas = document.createElement('canvas')
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)
        const ctx = canvas.getContext('2d')!

        await page.render({ canvasContext: ctx, viewport, canvas }).promise

        const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
          canvas.toBlob(
            async (blob) => {
              if (!blob) return reject(new Error('Canvas render failed'))
              resolve(new Uint8Array(await blob.arrayBuffer()))
            },
            'image/png'
          )
        })

        // Embed at original page dimensions (divide back by scale)
        const pngImage = await newPdf.embedPng(pngBytes)
        const origW = viewport.width / SCALE
        const origH = viewport.height / SCALE
        const pdfPage = newPdf.addPage([origW, origH])
        pdfPage.drawImage(pngImage, { x: 0, y: 0, width: origW, height: origH })

        canvas.width = 0
        canvas.height = 0
      }

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

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => (
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
          Enter the PDF open-password to remove protection. Output will be a clean, password-free PDF at original quality.
        </p>
      </div>
    </div>
  )

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

