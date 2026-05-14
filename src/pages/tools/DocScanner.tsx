import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Loader2,
  Filter,
  Sparkles,
  Crop as CropIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectDocument, transformPerspective, applyFilter, Point } from '../../lib/cv/scannerCore';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';

declare global {
  interface Window {
    cv: any;
  }
}

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

  // Dimensions for cropping UI
  const [imgDims, setImgDims] = useState({ width: 0, height: 0, naturalWidth: 1, naturalHeight: 1 });

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleCapture = () => {
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
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

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
        const pdfPage = pdfDoc.addPage([img.width, img.height] as [number, number]);
        pdfPage.drawImage(img, {
          x: 0, y: 0, width: img.width, height: img.height,
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

  const updateImgDims = useCallback(() => {
    if (cropImgRef.current) {
      const rect = cropImgRef.current.getBoundingClientRect();
      setImgDims({
        width: rect.width,
        height: rect.height,
        naturalWidth: cropImgRef.current.naturalWidth || 1,
        naturalHeight: cropImgRef.current.naturalHeight || 1
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateImgDims);
    return () => window.removeEventListener('resize', updateImgDims);
  }, [updateImgDims]);

  const getRelativePos = (point: Point) => {
    if (!cropImgRef.current) return { x: 0, y: 0 };
    const rect = cropImgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: 0, y: 0 };

    const x = (point.x / imgDims.naturalWidth) * rect.width + (rect.left - containerRect.left);
    const y = (point.y / imgDims.naturalHeight) * rect.height + (rect.top - containerRect.top);
    return { x, y };
  };

  const handlePointMove = (index: number, clientX: number, clientY: number) => {
    if (!cropImgRef.current || currentPageIndex === null) return;
    const rect = cropImgRef.current.getBoundingClientRect();

    const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const relY = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const x = (relX / rect.width) * imgDims.naturalWidth;
    const y = (relY / rect.height) * imgDims.naturalHeight;

    const updated = [...pages];
    updated[currentPageIndex].points[index] = { x, y };
    setPages(updated);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col pt-24 pb-12">
      <SEO
        title="Smart Document Scanner - CamScanner Style"
        description="Scan documents using your camera, auto-detect edges, and generate professional PDFs entirely in your browser."
      />

      <div className="max-w-4xl mx-auto w-full px-4 flex-1 flex flex-col">
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

        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="bg-[var(--surface)] p-8 rounded-3xl text-center shadow-2xl border border-[var(--border)]">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
                <p className="font-bold text-[var(--foreground)]">Processing...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <p className="text-[var(--foreground)] opacity-50 font-medium text-sm">Use your device camera to scan pages.</p>
                </div>
                {!isCVReady && <span className="text-xs text-red-500 font-bold">Loading Core...</span>}
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
                  <p className="text-[var(--foreground)] opacity-50 font-medium text-sm">Import existing photos or documents.</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept="image/*" className="hidden" />
              </button>
            </div>
          </motion.div>
        )}

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
              <button onClick={() => setStep('start')} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><X /></button>
              <button onClick={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><RotateCcw /></button>
            </div>
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1">
                <button onClick={handleCapture} className="w-full h-full bg-white rounded-full active:scale-90 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {step === 'crop' && currentPageIndex !== null && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 overflow-hidden flex-1 relative flex items-center justify-center" ref={containerRef}>
              <div className="relative">
                <img
                  ref={cropImgRef}
                  src={pages[currentPageIndex].original}
                  alt="Original document"
                  className="max-h-[60vh] md:max-h-[70vh] w-auto object-contain"
                  onLoad={updateImgDims}
                />

                {imgDims.width > 0 && (
                  <>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      <polygon
                        points={pages[currentPageIndex].points.map(p => {
                          const pos = getRelativePos(p);
                          return `${pos.x},${pos.y}`;
                        }).join(' ')}
                        fill="rgba(229, 9, 20, 0.15)"
                        stroke="rgba(229, 9, 20, 0.6)"
                        strokeWidth="3"
                      />
                    </svg>

                    {pages[currentPageIndex].points.map((p, i) => {
                      const pos = getRelativePos(p);
                      return (
                        <div
                          key={i}
                          className="absolute w-8 h-8 -ml-4 -mt-4 bg-white border-4 border-red-500 rounded-full cursor-move z-30 flex items-center justify-center shadow-xl active:scale-125 transition-transform"
                          style={{ left: pos.x, top: pos.y }}
                          onMouseDown={(e) => {
                            const move = (me: MouseEvent) => handlePointMove(i, me.clientX, me.clientY);
                            const up = () => {
                              window.removeEventListener('mousemove', move);
                              window.removeEventListener('mouseup', up);
                            };
                            window.addEventListener('mousemove', move);
                            window.addEventListener('mouseup', up);
                          }}
                          onTouchStart={(e) => {
                            const move = (te: TouchEvent) => handlePointMove(i, te.touches[0].clientX, te.touches[0].clientY);
                            const up = () => {
                              window.removeEventListener('touchmove', move);
                              window.removeEventListener('touchend', up);
                            };
                            window.addEventListener('touchmove', move);
                            window.addEventListener('touchend', up);
                          }}
                        >
                          <span className="text-[10px] font-bold text-red-500">{i + 1}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setPages(pages.filter((_, i) => i !== currentPageIndex)); setStep('start'); }} className="flex-1 py-4 bg-[var(--surface)] text-[var(--foreground)] font-bold rounded-2xl border border-[var(--border)] flex items-center justify-center gap-2"><Trash2 className="w-5 h-5" /> Cancel</button>
              <button onClick={handleCropComplete} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"><Check className="w-5 h-5" /> Process Scan</button>
            </div>
          </div>
        )}

        {step === 'filter' && currentPageIndex !== null && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-6 flex-1 flex flex-col">
              <div className="flex-1 relative rounded-xl overflow-hidden bg-black/5 flex items-center justify-center mb-6">
                <img
                  src={pages[currentPageIndex].processed}
                  alt="Processed scan"
                  className="max-h-full max-w-full object-contain shadow-lg"
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['original', 'magic', 'enhanced', 'bw', 'grayscale'].map(f => (
                  <button
                    key={f}
                    onClick={() => handleApplyFilter(f)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${pages[currentPageIndex].filter === f ? 'bg-red-500 text-white shadow-lg' : 'bg-[var(--background)] text-[var(--foreground)] opacity-60'}`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase">{f}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep('crop')} className="flex-1 py-4 bg-[var(--surface)] text-[var(--foreground)] font-bold rounded-2xl border border-[var(--border)] flex items-center justify-center gap-2"><CropIcon className="w-5 h-5" /> Back</button>
              <button onClick={() => setStep('list')} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"><Check className="w-5 h-5" /> Save Page</button>
            </div>
          </div>
        )}

        {step === 'list' && (
          <div className="flex-1 flex flex-col gap-8 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {pages.map((page, idx) => (
                <div key={page.id} className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3">
                  <img
                    src={page.processed}
                    alt={`Page ${idx + 1}`}
                    className="aspect-[3/4] rounded-lg object-contain mb-3 bg-black/5"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold opacity-50">Page {idx + 1}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setCurrentPageIndex(idx); setStep('filter'); }} className="p-1.5 hover:bg-[var(--background)] rounded-lg opacity-60"><Filter className="w-4 h-4" /></button>
                      <button onClick={() => { setPages(pages.filter(p => p.id !== page.id)); if (pages.length <= 1) setStep('start'); }} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg opacity-60"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setStep('start')} className="aspect-[3/4] border-2 border-[var(--border)] border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-red-500 transition-all opacity-40 hover:opacity-100">
                <Plus className="w-6 h-6 text-red-500" />
                <span className="text-xs font-bold">Add Page</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
