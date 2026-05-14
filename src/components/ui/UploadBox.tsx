import React, { useCallback } from 'react'
import { useDropzone, type DropzoneOptions } from 'react-dropzone'
import { motion, AnimatePresence } from 'motion/react'
import { FileUp, File, X } from 'lucide-react'
import { cn, formatBytes } from '../../lib/utils'
import { Button } from './Button'

interface UploadBoxProps {
  onUpload: (files: File[]) => void
  accept?: Record<string, string[]>
  maxFiles?: number
  title?: string
  description?: string
  multiple?: boolean
}

export function UploadBox({ 
  onUpload, 
  accept = { 'application/pdf': ['.pdf'] }, 
  maxFiles = 0, // 0 = unlimited
  title = "Choose files",
  description = "or drop them here",
  multiple = true
}: UploadBoxProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles)
    }
  }, [onUpload])

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept,
    maxFiles: maxFiles > 0 ? maxFiles : undefined,
    multiple,
    onDragEnter: undefined,
    onDragOver: undefined,
    onDragLeave: undefined
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneOptions)

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300",
        "bg-[var(--surface)] hover:bg-[var(--surface-hover)] group",
        isDragActive && "border-[var(--accent)] bg-[var(--accent-soft)]",
        isDragReject && "border-red-500 bg-red-50/50 dark:bg-red-900/10",
        !isDragActive && !isDragReject && "border-[var(--border)]"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <motion.div 
          animate={{ y: isDragActive ? -10 : 0, scale: isDragActive ? 1.1 : 1 }}
          className={cn(
            "p-4 rounded-2xl transition-colors",
            isDragActive ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-hover)] text-gray-500 dark:text-gray-400 group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]"
          )}
        >
          <FileUp className="w-10 h-10" />
        </motion.div>
        
        <div>
          <Button variant="primary" size="lg" className="pointer-events-none mb-4">
            {title}
          </Button>
          <p className="text-[var(--foreground)] opacity-60 font-medium">{description}</p>
        </div>
      </div>
    </div>
  )
}

export function FilePreviewList({ files, onRemove }: { files: File[], onRemove: (index: number) => void }) {
  return (
    <div className="mt-8 space-y-3">
      <AnimatePresence>
        {files.map((file, i) => (
          <motion.div
            key={`${file.name}-${i}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm"
          >
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                <File className="w-6 h-6" />
              </div>
              <div className="truncate">
                <p className="font-medium truncate text-sm">{file.name}</p>
                <p className="text-xs opacity-60">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              onClick={() => onRemove(i)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors shrink-0"
              aria-label="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
