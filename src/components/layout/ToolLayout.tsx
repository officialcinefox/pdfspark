import React from 'react'
import { motion } from 'motion/react'
import { Toaster, toast } from 'react-hot-toast'
import { Link, useLocation } from 'react-router-dom'
import { UploadBox, FilePreviewList } from '../ui/UploadBox'
import { Button } from '../ui/Button'
import { TOOL_CATEGORIES } from '../../lib/toolsData'
import { SEO } from '../SEO'
import { cn } from '../../lib/utils'
import { ToolIcon } from '../ui/ToolIcon'

interface ToolLayoutProps {
  title: string
  description: string
  icon: React.ReactNode
  colorClass: string
  onProcess: (files: File[]) => Promise<void>
  accept?: Record<string, string[]>
  maxFiles?: number
  controls?: (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => React.ReactNode
  buttonText?: string
  isProcessing?: boolean
  multiple?: boolean
  uploadTitle?: string
  uploadDescription?: string
  files?: File[]
  setFiles?: React.Dispatch<React.SetStateAction<File[]>>
}

export function ToolLayout({ 
  title, 
  description, 
  icon, 
  colorClass, 
  onProcess,
  accept,
  maxFiles,
  controls,
  buttonText = "Process Files",
  isProcessing = false,
  multiple = true,
  uploadTitle,
  uploadDescription,
  files: externalFiles,
  setFiles: externalSetFiles
}: ToolLayoutProps) {
  const [internalFiles, internalSetFiles] = React.useState<File[]>([])
  
  const files = externalFiles || internalFiles
  const setFiles = externalSetFiles || internalSetFiles
  const allowMultiple = multiple && maxFiles !== 1
  const location = useLocation()
  const currentPath = location.pathname
  const activeCategory = TOOL_CATEGORIES.find((category) =>
    category.tools.some((tool) => tool.path === currentPath)
  )
 
  const handleUpload = (uploaded: File[]) => {
    if (maxFiles && files.length + uploaded.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }
    setFiles(prev => [...prev, ...uploaded])
  }
 
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }
 
  const submit = async () => {
    if (files.length === 0) return
    try {
      await onProcess(files)
      // clear or show completion based on tool need
    } catch (error: any) {
      toast.error(error.message || "An error occurred during processing.")
    }
  }
 
  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 w-full pt-8 pb-24", !activeCategory && "flex flex-col items-center")}>
      <SEO 
        title={title}
        description={description}
        canonical={currentPath}
      />
      <Toaster position="bottom-center" />
      
      <div className="text-center mb-10">
        <div className={cn(
          "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5 transition-transform duration-500 hover:scale-110",
          colorClass === 'bg-transparent' ? "" : cn("shadow-lg", colorClass)
        )}>
          <ToolIcon icon={icon} className="w-12 h-12" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold mb-3">{title}</h1>
        <p className="text-lg opacity-60 max-w-2xl mx-auto">{description}</p>
      </div>

      <div className={cn("grid grid-cols-1 gap-8 items-start", activeCategory ? "lg:grid-cols-[280px_1fr]" : "max-w-4xl mx-auto w-full")}>
        {activeCategory && (
          <aside className="lg:sticky lg:top-24 hidden lg:block">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className="px-2 mb-3 border-b border-[var(--border)] pb-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40">{activeCategory.title}</p>
                <p className="text-[10px] opacity-40 mt-1">{activeCategory.tools.length} services</p>
              </div>
              <div className="space-y-1 mt-3">
                {activeCategory.tools.map((tool) => {
                  const active = tool.path === currentPath
                  return (
                    <Link
                      key={tool.id}
                      to={tool.path}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-3 transition-all duration-300",
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                          : "hover:bg-[var(--surface-hover)] opacity-70 hover:opacity-100"
                      )}
                    >
                      <span className={cn(
                        "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300",
                        active ? "bg-[var(--accent)] text-white scale-110 shadow-lg shadow-red-500/20" : tool.color
                      )}>
                        <ToolIcon icon={tool.icon} className="w-5 h-5" />
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-sm font-bold truncate", active && "text-[var(--accent)]")}>{tool.title}</span>
                        <span className="block text-[10px] opacity-60 truncate font-medium">{tool.description}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </aside>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 md:p-8"
          style={{ boxShadow: 'var(--panel-shadow)' }}
        >
          {files.length === 0 ? (
            <div className="max-w-xl mx-auto py-10">
              <UploadBox 
                onUpload={handleUpload} 
                accept={accept} 
                maxFiles={maxFiles}
                multiple={allowMultiple}
                title={uploadTitle}
                description={uploadDescription}
              />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", colorClass)}>
                    <ToolIcon icon={icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold">{title} Builder</h2>
                    <p className="text-xs opacity-50 font-medium">
                      {files.length} {files.length === 1 ? 'file' : 'files'} selected
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setFiles([])} disabled={isProcessing}>
                    Start Over
                  </Button>
                  <Button onClick={submit} isLoading={isProcessing}>
                    {buttonText}
                  </Button>
                </div>
              </div>

              {controls && controls(files, setFiles)}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
