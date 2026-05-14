import React, { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Settings, HardDrive, Target, AlertTriangle } from 'lucide-react'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { getToolById } from '../../lib/toolsData'
import toast from 'react-hot-toast'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { bytesToBlob, downloadBlob } from '../../lib/pdfToolHelpers'
import * as pdfjsLib from 'pdfjs-dist'
import { formatBytes } from '../../lib/utils'

type CompressionMode = 'preset' | 'custom'
type CompressionPreset = 'low' | 'recommended' | 'extreme'

export function CompressTool() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState<CompressionMode>('preset')
  const [preset, setPreset] = useState<CompressionPreset>('recommended')
  const [targetSize, setTargetSize] = useState<number>(1)
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('MB')
  
  const toolMeta = getToolById('compress')!

  const calculateEstimate = (files: File[]) => {
    if (!files.length) {
      return 0
    }
    const file = files[0]
    let est = 0
    if (mode === 'custom') {
      est = targetSize * (targetUnit === 'MB' ? 1024 * 1024 : 1024)
    } else {
      if (preset === 'low') est = file.size * 0.7
      if (preset === 'recommended') est = file.size * 0.4
      if (preset === 'extreme') est = file.size * 0.15
    }
    return Math.max(1024, est)
  }

  const handleProcess = async (files: File[]) => {
    setIsProcessing(true)
    const toastId = toast.loading('Analyzing document for compression...')
    try {
      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
      const numPages = pdf.numPages

      let targetBytes = 0
      let quality = 0.8
      let scale = 1.5

      if (mode === 'custom') {
        targetBytes = targetSize * (targetUnit === 'MB' ? 1024 * 1024 : 1024)
        const bytesPerPage = targetBytes / numPages
        
        // Dynamic quality adjustment based on target
        if (bytesPerPage > 500000) { scale = 2.0; quality = 0.9 } // > 500KB/page
        else if (bytesPerPage > 200000) { scale = 1.5; quality = 0.8 } // > 200KB/page
        else if (bytesPerPage > 100000) { scale = 1.2; quality = 0.6 } // > 100KB/page
        else { scale = 1.0; quality = 0.4 } // < 100KB/page
      } else {
        if (preset === 'low') { scale = 2.0; quality = 0.85 }
        if (preset === 'recommended') { scale = 1.5; quality = 0.7 }
        if (preset === 'extreme') { scale = 1.0; quality = 0.4 }
      }

      toast.loading(`Compressing ${numPages} pages... This may take a moment.`, { id: toastId })

      const newPdf = await PDFDocument.create()
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })
        
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)
        
        await page.render({ 
          canvasContext: context, 
          viewport,
          canvas: canvas
        }).promise
        
        // Get image as jpeg
        const imgData = canvas.toDataURL('image/jpeg', quality)
        
        const jpgImage = await newPdf.embedJpg(imgData)
        const pdfPage = newPdf.addPage([viewport.width, viewport.height])
        
        pdfPage.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        })
      }

      toast.loading('Finalizing PDF...', { id: toastId })
      const pdfBytes = await newPdf.save()
      const blob = bytesToBlob(pdfBytes)
      
      downloadBlob(blob, `compressed_${file.name}`)
      
      const savings = file.size - blob.size
      if (savings > 0) {
        toast.success(`Success! Saved ${formatBytes(savings)} (${Math.round((savings/file.size)*100)}%)`, { id: toastId })
      } else {
        toast.success(`Processed! Final size: ${formatBytes(blob.size)}.`, { id: toastId })
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to compress.", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    const estimatedSize = calculateEstimate(files)

    return (
      <div className="mt-8 space-y-6">
        <FilePreviewList files={files} onRemove={() => setFiles([])} />
        
        {files.length > 0 && (
          <div className="bg-[var(--surface)]/50 backdrop-blur-md rounded-3xl border border-[var(--border)] p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row gap-8">
              
              <div className="flex-1 space-y-6">
                <div className="flex items-center space-x-3 mb-6 border-b border-[var(--border)] pb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest opacity-80">Compression Settings</h3>
                </div>

                {/* Mode Selector */}
                <div className="flex bg-[var(--background)] p-1 rounded-xl border border-[var(--border)]">
                  <button
                    onClick={() => setMode('preset')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'preset' ? 'bg-white shadow-sm text-[var(--accent)]' : 'opacity-60 hover:opacity-100'}`}
                  >
                    Quick Presets
                  </button>
                  <button
                    onClick={() => setMode('custom')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'custom' ? 'bg-white shadow-sm text-[var(--accent)]' : 'opacity-60 hover:opacity-100'}`}
                  >
                    Target Size
                  </button>
                </div>

                {mode === 'preset' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'low', title: 'Less Compression', desc: 'High Quality', color: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                      { id: 'recommended', title: 'Recommended', desc: 'Balanced', color: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                      { id: 'extreme', title: 'Extreme', desc: 'Smallest Size', color: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/20' }
                    ].map(o => (
                      <button
                        key={o.id}
                        onClick={() => setPreset(o.id as any)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          preset === o.id 
                            ? `${o.color} ${o.bg} shadow-md scale-[1.02]` 
                            : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="font-black text-sm mb-1">{o.title}</div>
                        <div className="text-xs font-semibold opacity-60 uppercase tracking-wider">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[var(--background)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
                    <label className="block text-sm font-bold opacity-60 uppercase tracking-widest">Desired File Size</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={targetSize}
                        onChange={(e) => setTargetSize(Number(e.target.value))}
                        className="flex-1 bg-white border border-[var(--border)] rounded-xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      />
                      <select
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value as any)}
                        className="bg-white border border-[var(--border)] rounded-xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      >
                        <option value="MB">MB</option>
                        <option value="KB">KB</option>
                      </select>
                    </div>
                    <p className="text-xs font-semibold opacity-50 mt-2">
                      We will adjust the quality and resolution to get as close to this target as possible.
                    </p>
                  </div>
                )}
                
                <div className="flex items-start gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed">
                    <strong>Note:</strong> To achieve true file size reduction in the browser, pages are converted to optimized images. Text will remain readable but will not be selectable.
                  </p>
                </div>

              </div>

              {/* Estimation Panel */}
              <div className="lg:w-72 bg-gradient-to-b from-[var(--background)] to-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-inner flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-16 h-16 bg-[var(--accent-soft)] rounded-2xl flex items-center justify-center shadow-sm">
                  <HardDrive className="w-8 h-8 text-[var(--accent)]" />
                </div>
                
                <div className="space-y-4 w-full">
                  <div>
                    <div className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Original Size</div>
                    <div className="text-xl font-bold opacity-70 line-through decoration-red-500 decoration-2">
                      {formatBytes(files[0].size)}
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                  
                  <div>
                    <div className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em] mb-1 flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" /> Estimated Output
                    </div>
                    <div className="text-3xl font-black text-[var(--accent)]">
                      {estimatedSize > 0 ? formatBytes(estimatedSize) : '...'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <ToolLayout
      title="Compress PDF"
      description="Reduce file size drastically while optimizing for maximal quality."
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      onProcess={handleProcess}
      maxFiles={1}
      buttonText="Compress PDF"
      isProcessing={isProcessing}
      controls={controls}
    />
  )
}
