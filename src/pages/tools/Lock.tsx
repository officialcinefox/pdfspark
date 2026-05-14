import React, { useState } from 'react'
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { getToolById } from '../../lib/toolsData'
import toast from 'react-hot-toast'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { downloadBytes } from '../../lib/pdfToolHelpers'

export function LockTool() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [password, setPassword] = useState('')
  const toolMeta = getToolById('lock')!

  const processLock = async (files: File[]) => {
    if (password.trim().length < 6) {
      toast.error('Use a password with at least 6 characters.')
      return
    }
    setIsProcessing(true)
    try {
      const file = files[0]
      const pdfBytes = new Uint8Array(await file.arrayBuffer())
      const ownerPassword = `${password}-owner-${Date.now()}`
      const encryptedBytes = await encryptPDF(pdfBytes, password, ownerPassword)
      downloadBytes(encryptedBytes, `protected_${file.name}`)
      setPassword('')

      toast.success("Password protected PDF created.")
    } catch (error: any) {
      console.error(error)
      throw new Error(error.message || "Failed to lock.")
    } finally {
      setIsProcessing(false)
    }
  }

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    return (
      <div className="mt-8 space-y-6">
        <FilePreviewList files={files} onRemove={() => setFiles([])} />
        
        <div className="bg-[var(--background)] rounded-2xl p-6 border border-[var(--border)] max-w-sm mx-auto">
          <label className="block text-sm font-semibold mb-2">Set Password</label>
          <input 
            type="password"
            placeholder="Enter secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
          />
          <p className="text-xs opacity-60 mt-2">Use at least 6 characters. Keep the password safe and share it separately from the PDF.</p>
        </div>
      </div>
    )
  }

  return (
    <ToolLayout
      title="Protect PDF"
      description="Encrypt your PDF with a password to keep sensitive data confidential."
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      onProcess={processLock}
      maxFiles={1}
      buttonText="Protect PDF"
      isProcessing={isProcessing}
      controls={controls}
    />
  )
}
