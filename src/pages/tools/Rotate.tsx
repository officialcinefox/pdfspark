import React, { useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { RotateCw } from 'lucide-react'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { getToolById } from '../../lib/toolsData'
import toast from 'react-hot-toast'
import { FilePreviewList } from '../../components/ui/UploadBox'
import { Button } from '../../components/ui/Button'
import { downloadBytes } from '../../lib/pdfToolHelpers'

export function RotateTool() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [angle, setAngle] = useState(90)
  const toolMeta = getToolById('rotate')!

  const processRotate = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      
      const pages = pdf.getPages()
      pages.forEach(page => {
        const currentRotation = page.getRotation().angle
        page.setRotation(degrees(currentRotation + angle))
      })

      const pdfBytes = await pdf.save()
      downloadBytes(pdfBytes, `rotated_${file.name}`)
      
      toast.success("PDF Rotated successfully!")
    } catch (error: any) {
      console.error(error)
      throw new Error(error.message || "Failed to rotate.")
    } finally {
      setIsProcessing(false)
    }
  }

  const controls = (files: File[], setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    return (
      <div className="mt-8 space-y-6">
        <FilePreviewList files={files} onRemove={() => setFiles([])} />
        
        <div className="bg-[var(--background)] rounded-2xl p-8 border border-[var(--border)] text-center flex flex-col items-center justify-center">
          <p className="font-semibold mb-6">Direction</p>
          <div className="flex items-center space-x-6">
            <Button variant={angle === -90 ? 'primary' : 'outline'} onClick={() => setAngle(-90)} className="w-32">
              Left
            </Button>
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-transform" style={{ transform: `rotate(${angle}deg)` }}>
              <RotateCw className="w-8 h-8" />
            </div>
            <Button variant={angle === 90 ? 'primary' : 'outline'} onClick={() => setAngle(90)} className="w-32">
              Right
            </Button>
          </div>
          <Button variant={angle === 180 ? 'primary' : 'ghost'} onClick={() => setAngle(180)} className="mt-6">
            Upside Down
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ToolLayout
      title="Rotate PDF"
      description="Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!"
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      onProcess={processRotate}
      maxFiles={1}
      buttonText="Rotate PDF"
      isProcessing={isProcessing}
      controls={controls}
    />
  )
}
