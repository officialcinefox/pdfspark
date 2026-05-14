import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Check, 
  X, 
  Trash2, 
  Download, 
  Plus, 
  Move,
  Loader2,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Crop as CropIcon,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectDocument, transformPerspective, applyFilter, Point } from '../../lib/cv/scannerCore';
import { PDFDocument, rgb } from 'pdf-lib';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';

interface ScannedPage {
  id: string;
  original: string;
  processed: string;
  points: Point[];
  filter: string;
  rotation: number;
}

export const DocScanner: React.FC = () => {
  const [step, setStep] = useState<'start' | 'camera' | 'crop' | 'filter' | 'list'>('start');
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number | null>(null);
  const [isCVReady, setIsCVReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  
  // Refs for processing
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if OpenCV is loaded
  useEffect(() => {
    const checkCV = setInterval(() => {
      if (window.cv && window.cv.imread) {
        setIsCVReady(true);
        clearInterval(checkCV);
      }
    }, 500);
    return () => clearInterval(checkCV);
  }, []);

  const handleCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    processNewImage(imageSrc);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        processNewImage(result);
      };
      reader.readAsDataURL(file);
    });
  };

  const processNewImage = async (dataUrl: string) => {
    setIsLoading(true);
    try {
      // Create a temporary canvas to run detection
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        
        // Ensure unique ID for OpenCV to read
        canvas.id = `proc-${Date.now()}`;
        document.body.appendChild(canvas);
        
        const detection = await detectDocument(canvas.id);
        document.body.removeChild(canvas);

        const defaultPoints = detection.found ? detection.points : [
          { x: img.width * 0.1, y: img.height * 0.1 },
          { x: img.width * 0.9, y: img.height * 0.1 },
          { x: img.width * 0.9, y: img.height * 0.9 },
          { x: img.width * 0.1, y: img.height * 0.9 },
        ];

        const newPage: ScannedPage = {
          id: Math.random().toString(36).substr(2, 9),
          original: dataUrl,
          processed: dataUrl,
          points: defaultPoints,
          filter: 'original',
          rotation: 0
        };

        setPages(prev => [...prev, newPage]);
        setCurrentPageIndex(pages.length);
        setStep('crop');
        setIsLoading(false);
      };
      img.src = dataUrl;
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("Processing failed. Try again.");
    }
  };

  const handleCropComplete = async () => {
    if (currentPageIndex === null) return;
    setIsLoading(true);
    
    const page = pages[currentPageIndex];
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      // We use A4 aspect ratio for output
      const targetWidth = 1200;
      const targetHeight = 1600;
      
      const processed = await transformPerspective(canvas, page.points, targetWidth, targetHeight);
      
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = { ...page, processed };
      setPages(updatedPages);
      setStep('filter');
      setIsLoading(false);
    };
    img.src = page.original;
  };

  const handleApplyFilter = async (filterType: string) => {
    if (currentPageIndex === null) return;
    setIsLoading(true);
    
    const page = pages[currentPageIndex];
    const filtered = await applyFilter(page.processed, filterType as any);
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = { ...page, filter: filterType, processed: filtered };
    setPages(updatedPages);
    setIsLoading(false);
  };

  const generatePDF = async () => {
    setIsLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const page of pages) {
        const imgBytes = await fetch(page.processed).then(res => res.arrayBuffer());
        const img = await pdfDoc.embedJpg(imgBytes);
        const pdfPage = pdfDoc.addPage([img.width, img.height]);
        pdfPage.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scanned-document-${Date.now()}.pdf`;
      link.click();
      
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  // UI Components
  const CornerHandle = ({ point, onMove, index }: { point: Point, onMove: (p: Point) => void, index: number }) => {
    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const container = e.currentTarget.parentElement;
      if (!container) return;

      const moveHandler = (moveEvent: any) => {
        const rect = container.getBoundingClientRect();
        const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
        
        const x = ((clientX - rect.left) / rect.width) * container.dataset.origW!;
        const y = ((clientY - rect.top) / rect.height) * container.dataset.origH!;
        
        onMove({ x: Math.max(0, Math.min(x, Number(container.dataset.origW))), y: Math.max(0, Math.min(y, Number(container.dataset.origH))) });
      };

      const upHandler = () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', upHandler);
      };

      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
      window.addEventListener('touchmove', moveHandler);
      window.addEventListener('touchend', upHandler);
    };

    return (
      <div 
        className="absolute w-8 h-8 -ml-4 -mt-4 bg-white border-4 border-red-500 rounded-full cursor-move z-30 flex items-center justify-center shadow-lg"
        style={{ left: `${(point.x / Number(document.getElementById('crop-container')?.dataset.origW)) * 100}%`, top: `${(point.y / Number(document.getElementById('crop-container')?.dataset.origH)) * 100}%` }}
        onMouseDown={handleDrag}
        onTouchStart={handleDrag}
      >
        <span className="text-[10px] font-bold text-red-500">{index + 1}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col pt-24 pb-12">
      <SEO 
        title="Smart Document Scanner - CamScanner Style"
        description="Scan documents using your camera, auto-detect edges, and generate professional PDFs entirely in your browser. Free, secure, and fast."
      />
      
      <div className="max-w-4xl mx-auto w-full px-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[var(--foreground)] flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-red-500" />
              Smart Scanner
            </h1>
            <p className="text-[var(--foreground)] opacity-50 font-medium">Professional document digitization.</p>
          </div>
          {pages.length > 0 && step === 'list' && (
            <button 
              onClick={generatePDF}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>
          )}
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="bg-[var(--surface)] p-8 rounded-3xl text-center shadow-2xl border border-[var(--border)]">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
                <p className="font-bold text-[var(--foreground)]">Processing Image...</p>
                <p className="text-sm text-[var(--foreground)] opacity-50">OpenCV is working its magic</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step: Start */}
        {step === 'start' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <button 
                onClick={() => setStep('camera')}
                disabled={!isCVReady}
                className="group p-10 bg-[var(--surface)] border-2 border-[var(--border)] border-dashed rounded-[2.5rem] hover:border-red-500 transition-all text-center flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-10 h-10 text-red-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--foreground)] mb-2">Scan with Camera</h3>
                  <p className="text-[var(--foreground)] opacity-50 font-medium">Use your device camera to scan pages.</p>
                </div>
                {!isCVReady && (
                  <span className="text-xs text-red-500 font-bold bg-red-500/10 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading Core...
                  </span>
                )}
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!isCVReady}
                className="group p-10 bg-[var(--surface)] border-2 border-[var(--border)] border-dashed rounded-[2.5rem] hover:border-red-500 transition-all text-center flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-red-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--foreground)] mb-2">Upload from Gallery</h3>
                  <p className="text-[var(--foreground)] opacity-50 font-medium">Import existing photos or documents.</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
              </button>
            </div>
            
            <div className="mt-12 p-6 bg-red-500/5 rounded-2xl border border-red-500/10 max-w-lg text-center">
              <p className="text-sm text-[var(--foreground)] opacity-60 italic leading-relaxed">
                "Smart Scanner uses browser-based OpenCV.js for professional-grade document detection. No images are uploaded to any server – everything happens locally on your device."
              </p>
            </div>
          </motion.div>
        )}

        {/* Step: Camera */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col bg-black rounded-[2rem] overflow-hidden relative">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: cameraFacing, width: 1280, height: 720 }}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute top-6 left-6 right-6 flex justify-between">
              <button onClick={() => setStep('start')} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white">
                <X />
              </button>
              <button 
                onClick={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')}
                className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white"
              >
                <RotateCcw />
              </button>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1">
                <button 
                  onClick={handleCapture}
                  className="w-full h-full bg-white rounded-full active:scale-90 transition-transform"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Crop */}
        {step === 'crop' && currentPageIndex !== null && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 overflow-hidden flex-1 relative">
              <div 
                id="crop-container"
                className="relative mx-auto h-full flex items-center justify-center"
                data-orig-w={1} // Placeholders, updated dynamically if needed
                data-orig-h={1}
              >
                <img 
                  id="crop-img"
                  src={pages[currentPageIndex].original} 
                  className="max-h-full max-w-full object-contain"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const container = document.getElementById('crop-container');
                    if (container) {
                      container.dataset.origW = img.naturalWidth.toString();
                      container.dataset.origH = img.naturalHeight.toString();
                    }
                  }}
                />
                
                {/* Overlay SVG for selection */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                  <polygon 
                    points={pages[currentPageIndex].points.map(p => {
                      const img = document.getElementById('crop-img') as HTMLImageElement;
                      if (!img) return '0,0';
                      const rect = img.getBoundingClientRect();
                      const parentRect = img.parentElement!.getBoundingClientRect();
                      const x = (p.x / img.naturalWidth) * rect.width + (rect.left - parentRect.left);
                      const y = (p.y / img.naturalHeight) * rect.height + (rect.top - parentRect.top);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="rgba(229, 9, 20, 0.1)"
                    stroke="rgba(229, 9, 20, 0.5)"
                    strokeWidth="2"
                  />
                </svg>

                {/* Handles */}
                {pages[currentPageIndex].points.map((p, i) => (
                  <CornerHandle 
                    key={i} index={i} point={p} 
                    onMove={(newP) => {
                      const updated = [...pages];
                      updated[currentPageIndex].points[i] = newP;
                      setPages(updated);
                    }} 
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  const updated = [...pages];
                  updated.splice(currentPageIndex, 1);
                  setPages(updated);
                  setStep('start');
                }}
                className="flex-1 py-4 bg-[var(--surface)] text-[var(--foreground)] font-bold rounded-2xl border border-[var(--border)] flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" /> Cancel
              </button>
              <button 
                onClick={handleCropComplete}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                <Check className="w-5 h-5" /> Process Scan
              </button>
            </div>
          </div>
        )}

        {/* Step: Filter */}
        {step === 'filter' && currentPageIndex !== null && (
          <div className="flex-1 flex flex-col gap-8">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-8 flex-1 flex flex-col">
              <div className="flex-1 relative rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center mb-8">
                <img 
                  src={pages[currentPageIndex].processed} 
                  className="max-h-full max-w-full object-contain shadow-2xl" 
                />
              </div>

              <div className="grid grid-cols-5 gap-3">
                {[
                  { id: 'original', name: 'Original' },
                  { id: 'magic', name: 'Magic' },
                  { id: 'enhanced', name: 'Clean' },
                  { id: 'bw', name: 'B&W' },
                  { id: 'grayscale', name: 'Gray' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => handleApplyFilter(f.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${pages[currentPageIndex].filter === f.id ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[var(--background)] text-[var(--foreground)] opacity-60 hover:opacity-100 border border-[var(--border)]'}`}
                  >
                    <Filter className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep('crop')}
                className="flex-1 py-4 bg-[var(--surface)] text-[var(--foreground)] font-bold rounded-2xl border border-[var(--border)] flex items-center justify-center gap-2"
              >
                <CropIcon className="w-5 h-5" /> Back to Crop
              </button>
              <button 
                onClick={() => setStep('list')}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                <Check className="w-5 h-5" /> Save Page
              </button>
            </div>
          </div>
        )}

        {/* Step: List (Page Management) */}
        {step === 'list' && (
          <div className="flex-1 flex flex-col gap-8 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {pages.map((page, idx) => (
                <motion.div 
                  layout
                  key={page.id}
                  className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 hover:border-red-500 transition-all"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black/5 relative mb-4">
                    <img src={page.processed} className="w-full h-full object-contain" />
                    <div className="absolute top-2 left-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setCurrentPageIndex(idx);
                        setStep('filter');
                      }}
                      className="p-2 text-[var(--foreground)] opacity-40 hover:opacity-100 hover:bg-[var(--background)] rounded-xl transition-all"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const updated = [...pages];
                        updated.splice(idx, 1);
                        setPages(updated);
                        if (updated.length === 0) setStep('start');
                      }}
                      className="p-2 text-red-500 opacity-40 hover:opacity-100 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              <button 
                onClick={() => setStep('start')}
                className="aspect-[3/4] border-2 border-[var(--border)] border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-red-500 transition-all text-[var(--foreground)] opacity-40 hover:opacity-80"
              >
                <div className="w-12 h-12 bg-red-500/5 rounded-2xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-red-500" />
                </div>
                <span className="font-bold text-sm">Add Page</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
