import React, { useMemo, useState, useEffect } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { 
  ArrowDown, 
  ArrowUp, 
  FileImage, 
  Trash2, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  AlignStartVertical, 
  AlignCenterVertical, 
  AlignEndVertical,
  Monitor,
  Smartphone,
  Eye,
  Settings2,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  LayoutGrid
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ToolLayout } from '../../components/layout/ToolLayout'
import { Button } from '../../components/ui/Button'
import { formatBytes } from '../../lib/utils'
import { getToolById } from '../../lib/toolsData'
import { cn } from '../../lib/utils'
import { downloadBytes } from '../../lib/pdfToolHelpers'

type PageSize = 'image' | 'a4' | 'letter'
type Alignment = 'left' | 'center' | 'right'
type VAlignment = 'top' | 'center' | 'bottom'
type Orientation = 'portrait' | 'landscape'

interface PageConfig {
  images: File[]
  imagesPerPage: number
  pageSize: PageSize
  margin: number
  align: Alignment
  valign: VAlignment
  orientation: Orientation
}

interface ImageControlsProps {
  page: PageConfig
  updatePage: (update: Partial<PageConfig>) => void
  onAddPage: () => void
  onUpload: (files: File[]) => void
  currentPageIdx: number
}

const IMAGE_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/bmp': ['.bmp']
}

const PAGE_SIZES: Record<Exclude<PageSize, 'image'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792]
}

function isJpeg(file: File) {
  return file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name)
}

function isPng(file: File) {
  return file.type === 'image/png' || /\.png$/i.test(file.name)
}

async function prepareImageBytes(file: File) {
  if (isJpeg(file) || isPng(file)) {
    return {
      type: isJpeg(file) ? 'jpg' as const : 'png' as const,
      bytes: new Uint8Array(await file.arrayBuffer())
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Could not read ${file.name}`))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas error')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
    return { type: 'png' as const, bytes: new Uint8Array(await blob.arrayBuffer()) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function LivePreview({ 
  page,
  currentPageIdx,
  totalPages,
  onPageChange
}: { 
  page: PageConfig,
  currentPageIdx: number,
  totalPages: number,
  onPageChange: (idx: number) => void
}) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const { images, imagesPerPage, pageSize, margin, align, valign, orientation } = page

  useEffect(() => {
    const urls = images.map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  const isLandscape = orientation === 'landscape'
  const baseWidth = pageSize === 'image' ? 300 : (pageSize === 'a4' ? 210 : 215)
  const baseHeight = pageSize === 'image' ? 400 : (pageSize === 'a4' ? 297 : 279)
  
  const displayW = isLandscape ? baseHeight : baseWidth
  const displayH = isLandscape ? baseWidth : baseHeight
  const ratio = displayW / displayH

  const cols = imagesPerPage === 1 ? 1 : (imagesPerPage === 2 ? 1 : 2)
  const rows = Math.ceil(imagesPerPage / cols)
  const gridCols = cols === 1 ? 'grid-cols-1' : 'grid-cols-2'

  return (
    <div className="bg-[var(--background)] rounded-3xl p-6 md:p-8 border border-[var(--border)] shadow-inner flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="font-bold text-lg">Real-time Preview</h3>
        </div>
        <div className="px-3 py-1 bg-white rounded-full border border-[var(--border)] text-[10px] font-black opacity-40 uppercase tracking-widest shadow-sm">
          Page {currentPageIdx + 1} of {totalPages}
        </div>
      </div>
      
      <div 
        className="relative bg-white shadow-2xl border-2 border-gray-200 overflow-hidden transition-all duration-300 flex items-center justify-center group/page"
        style={{ 
          width: '280px', 
          aspectRatio: pageSize === 'image' ? 'auto' : `${ratio}`,
          minHeight: '200px'
        }}
      >
        {images.length > 0 ? (
          <div 
            className={cn("absolute inset-0 grid gap-2", gridCols)}
            style={{ 
              padding: `${(margin / 841) * 100}%`,
              gridTemplateRows: rows > 1 ? `repeat(${rows}, 1fr)` : '1fr'
            } as any}
          >
            {previewUrls.slice(0, imagesPerPage).map((url, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex w-full h-full overflow-hidden transition-all duration-300",
                  valign === 'top' ? 'items-start' : (valign === 'center' ? 'items-center' : 'items-end'),
                  align === 'left' ? 'justify-start' : (align === 'center' ? 'justify-center' : 'justify-end')
                )}
              >
                <img 
                  src={url} 
                  className="max-w-full max-h-full object-contain shadow-sm border border-gray-100" 
                  alt={`Preview ${i}`} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center opacity-20">
            <PlusCircle className="w-10 h-10 mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Page {currentPageIdx + 1} is empty</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button 
          onClick={() => onPageChange(currentPageIdx - 1)}
          disabled={currentPageIdx === 0}
          className="p-3 rounded-full bg-white hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:opacity-20 transition-all border border-[var(--border)] shadow-sm group"
        >
          <ChevronLeft className="w-6 h-6 group-active:scale-90 transition-transform" />
        </button>
        
        <div className="flex gap-1.5 px-4 py-2 bg-white rounded-full border border-[var(--border)] shadow-inner">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentPageIdx === i ? 'bg-[var(--accent)] scale-150' : 'bg-gray-200 hover:bg-gray-300'}`}
            />
          ))}
        </div>

        <button 
          onClick={() => onPageChange(currentPageIdx + 1)}
          disabled={currentPageIdx === totalPages - 1}
          className="p-3 rounded-full bg-white hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:opacity-20 transition-all border border-[var(--border)] shadow-sm group"
        >
          <ChevronRight className="w-6 h-6 group-active:scale-90 transition-transform" />
        </button>
      </div>
      
      <p className="mt-4 text-[10px] opacity-40 font-bold uppercase tracking-[0.2em]">Live View Mode</p>
    </div>
  )
}

function ImageControls({
  page,
  updatePage,
  onAddPage,
  onUpload,
  currentPageIdx
}: ImageControlsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { images, imagesPerPage, pageSize, margin, align, valign, orientation } = page

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    if (selected.length > 0) {
      onUpload(selected as File[])
    }
    event.target.value = ''
  }

  return (
    <div className="space-y-8">
      <div className="bg-[var(--surface)]/50 rounded-3xl p-6 border border-[var(--border)]">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2"><Settings2 className="w-5 h-5" /> Quick Settings</h3>
            <div className="flex gap-1 bg-[var(--background)] p-1 rounded-xl border border-[var(--border)]">
               <button onClick={() => updatePage({ orientation: 'portrait' })} className={`p-1.5 rounded-lg transition-all ${orientation === 'portrait' ? 'bg-[var(--accent)] text-white' : 'opacity-40'}`}><Smartphone className="w-4 h-4" /></button>
               <button onClick={() => updatePage({ orientation: 'landscape' })} className={`p-1.5 rounded-lg transition-all ${orientation === 'landscape' ? 'bg-[var(--accent)] text-white' : 'opacity-40'}`}><Monitor className="w-4 h-4" /></button>
            </div>
         </div>

          <div className="grid grid-cols-3 gap-2">
            {['image', 'a4', 'letter'].map((s) => (
              <button 
                key={s} 
                onClick={() => updatePage({ pageSize: s as PageSize })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${pageSize === s ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md' : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-hover)] opacity-70'}`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="text-xs font-black uppercase opacity-40 tracking-widest block mb-3">Images per Page</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button 
                  key={n} 
                  onClick={() => updatePage({ imagesPerPage: n })}
                  className={`py-2 rounded-xl text-sm font-bold border transition-all ${imagesPerPage === n ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md' : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-hover)] opacity-70'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

         {pageSize !== 'image' && (
           <div className="mt-6 space-y-6">
              <div className="space-y-3">
                 <label className="text-xs font-black uppercase opacity-40 tracking-widest block">Horizontal Alignment</label>
                 <div className="flex gap-2">
                    {[
                      { id: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                      { id: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                      { id: 'right', icon: <AlignRight className="w-4 h-4" /> }
                    ].map(a => (
                      <button key={a.id} onClick={() => updatePage({ align: a.id as Alignment })} className={`flex-1 py-3 rounded-xl border flex items-center justify-center transition-all ${align === a.id ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}>
                        {a.icon}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-black uppercase opacity-40 tracking-widest block">Vertical Alignment</label>
                 <div className="flex gap-2">
                    {[
                      { id: 'top', icon: <AlignStartVertical className="w-4 h-4" /> },
                      { id: 'center', icon: <AlignCenterVertical className="w-4 h-4" /> },
                      { id: 'bottom', icon: <AlignEndVertical className="w-4 h-4" /> }
                    ].map(a => (
                      <button key={a.id} onClick={() => updatePage({ valign: a.id as VAlignment })} className={`flex-1 py-3 rounded-xl border flex items-center justify-center transition-all ${valign === a.id ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}>
                        {a.icon}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-black uppercase opacity-40">
                   <span>Page Margin</span>
                   <span>{margin}pt</span>
                </div>
                <input type="range" min="0" max="100" step="5" value={margin} onChange={e => updatePage({ margin: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
              </div>
           </div>
         )}
      </div>

      <div className="bg-[var(--surface)]/50 rounded-3xl p-6 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h3 className="font-bold flex items-center gap-2"><FileImage className="w-5 h-5 text-[var(--accent)]" /> Page Files ({images.length})</h3>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Adding to Page {currentPageIdx + 1}</p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 h-8 px-2 text-[10px]">
              <ArrowUp className="w-3 h-3" /> Upload
            </Button>
            <Button variant="outline" size="sm" onClick={onAddPage} className="flex items-center gap-1 h-8 px-2 text-[10px] border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]">
              <PlusCircle className="w-3 h-3" /> Page
            </Button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {images.map((file, index) => (
            <div key={index} className="flex items-center justify-between gap-3 p-3 bg-[var(--background)] rounded-2xl border border-[var(--border)] group">
               <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-bold opacity-30 w-4">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{file.name}</p>
                    <p className="text-[10px] opacity-50 font-medium">{formatBytes(file.size)}</p>
                  </div>
               </div>
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => {
                    const next = [...images];
                    [next[index], next[index-1]] = [next[index-1], next[index]];
                    updatePage({ images: next });
                  }} disabled={index === 0} className="p-1.5 hover:bg-[var(--surface-hover)] rounded-lg disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => updatePage({ images: images.filter((_, i) => i !== index) })} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
               </div>
            </div>
          ))}
          {images.length === 0 && (
            <div className="py-12 text-center opacity-30">
               <p className="text-sm font-bold italic">No images on this page yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ImageToPdfTool() {
  const toolMeta = getToolById('image-to-pdf')!
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [pages, setPages] = useState<PageConfig[]>([{
    images: [],
    imagesPerPage: 1,
    pageSize: 'image',
    margin: 30,
    align: 'center',
    valign: 'center',
    orientation: 'portrait'
  }])

  const updateCurrentPage = (update: Partial<PageConfig>) => {
    setPages(prev => prev.map((p, i) => i === currentPageIdx ? { ...p, ...update } : p))
  }

  const addPage = () => {
    const lastPage = pages[pages.length - 1]
    setPages([...pages, {
      ...lastPage,
      images: []
    }])
    setCurrentPageIdx(pages.length)
  }

  const uploadToCurrentPage = (files: File[]) => {
    updateCurrentPage({
      images: [...pages[currentPageIdx].images, ...files]
    })
  }

  const totalImagesCount = (pageList: PageConfig[]) => pageList.reduce((sum, p) => sum + p.images.length, 0)

  const processImages = async () => {
    const allFiles = pages.flatMap(p => p.images)
    if (allFiles.length === 0) {
      toast.error("Please add at least one image")
      return
    }
    setIsProcessing(true)

    try {
      const pdf = await PDFDocument.create()

      for (const p of pages) {
        if (p.images.length === 0) continue

        let pageWidth, pageHeight
        const firstImg = p.images[0]
        const preparedFirst = await prepareImageBytes(firstImg)
        const embeddedFirst = preparedFirst.type === 'jpg' ? await pdf.embedJpg(preparedFirst.bytes) : await pdf.embedPng(preparedFirst.bytes)

        if (p.pageSize === 'image') {
          pageWidth = embeddedFirst.width
          pageHeight = embeddedFirst.height
        } else {
          const base = PAGE_SIZES[p.pageSize]
          pageWidth = p.orientation === 'portrait' ? base[0] : base[1]
          pageHeight = p.orientation === 'portrait' ? base[1] : base[0]
        }

        const usableW = Math.max(pageWidth - p.margin * 2, 1)
        const usableH = Math.max(pageHeight - p.margin * 2, 1)

        const totalImagesInPage = p.images.slice(0, p.imagesPerPage)
        const page = pdf.addPage([pageWidth, pageHeight])
        page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) })

        const cols = p.imagesPerPage === 1 ? 1 : (p.imagesPerPage === 2 ? 1 : 2)
        const rows = Math.ceil(p.imagesPerPage / cols)
        
        const cellW = usableW / cols
        const cellH = usableH / rows

        for (let j = 0; j < totalImagesInPage.length; j++) {
          const file = totalImagesInPage[j]
          const prepared = await prepareImageBytes(file)
          const embedded = prepared.type === 'jpg' ? await pdf.embedJpg(prepared.bytes) : await pdf.embedPng(prepared.bytes)
          
          const colIdx = j % cols
          const rowIdx = Math.floor(j / cols)

          const scale = Math.min(cellW / embedded.width, cellH / embedded.height)
          const dW = embedded.width * scale
          const dH = embedded.height * scale

          let xIdx = colIdx * cellW
          if (p.align === 'center') xIdx += (cellW - dW) / 2
          else if (p.align === 'right') xIdx += (cellW - dW)

          let yIdx = (rows - 1 - rowIdx) * cellH
          if (p.valign === 'center') yIdx += (cellH - dH) / 2
          else if (p.valign === 'top') yIdx += (cellH - dH)

          page.drawImage(embedded, { 
            x: p.margin + xIdx, 
            y: p.margin + yIdx, 
            width: dW, 
            height: dH 
          })
        }
      }

      const bytes = await pdf.save({ useObjectStreams: true })
      downloadBytes(bytes, `pdfspark-${Date.now()}.pdf`)
      toast.success('Professional PDF Generated!')
      
      // Auto-reset state for new project
      setPages([{
        images: [],
        imagesPerPage: 1,
        pageSize: 'image',
        margin: 30,
        align: 'center',
        valign: 'center',
        orientation: 'portrait'
      }])
      setCurrentPageIdx(0)
    } catch (error: any) {
      toast.error(error.message || 'Error processing images')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ToolLayout
      title="Image to PDF"
      description="Professional multi-page document builder with per-page layout control."
      icon={toolMeta.icon}
      colorClass={toolMeta.color}
      accept={IMAGE_ACCEPT}
      files={pages[currentPageIdx].images}
      setFiles={(update) => {
        setPages(prevPages => {
          const currentImages = prevPages[currentPageIdx].images
          const nextImages = typeof update === 'function' ? update(currentImages) : update
          
          if (nextImages.length === 0 && currentImages.length > 0 && totalImagesCount(prevPages) > 0) {
            setCurrentPageIdx(0)
            return [{
              images: [],
              imagesPerPage: 1,
              pageSize: 'image',
              margin: 30,
              align: 'center',
              valign: 'center',
              orientation: 'portrait'
            }]
          }

          return prevPages.map((p, i) => i === currentPageIdx ? { ...p, images: nextImages } : p)
        })
      }}
      onProcess={processImages}
      buttonText="Generate PDF"
      isProcessing={isProcessing}
      multiple={true}
      controls={() => (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 mt-4">
           <ImageControls
              page={pages[currentPageIdx]}
              updatePage={updateCurrentPage}
              onAddPage={addPage}
              onUpload={uploadToCurrentPage}
              currentPageIdx={currentPageIdx}
           />
           <LivePreview 
              page={pages[currentPageIdx]}
              currentPageIdx={currentPageIdx}
              totalPages={pages.length}
              onPageChange={setCurrentPageIdx}
           />
        </div>
      )}
    />
  )
}
