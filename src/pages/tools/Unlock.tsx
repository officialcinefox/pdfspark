import React, { useState } from 'react'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { getToolById } from '../../lib/toolsData'
import toast from 'react-hot-toast'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { loadPdf, savePdf } from '../../lib/pdfToolHelpers'

export function UnlockTool() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [password, setPassword] = useState('')
  const toolMeta = getToolById('unlock')!

  const processUnlock = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const file = files[0]
      // We set ignoreEncryption to false so it actually tries to decrypt with the password
      const pdf = await loadPdf(file, false, password)
      
      await savePdf(pdf, `unlocked_${file.name}`)
      toast.success("PDF Unlocked successfully!")
    } catch (error: any) {
      console.error(error)
      throw new Error(error.message || "Failed to unlock. Check password or file permissions.")
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
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
          />
          <p className="text-xs opacity-60 mt-3 flex items-start">
             Password removal works for open-passwords. If the PDF has permission restrictions, this tool will rewrite it without them.
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
