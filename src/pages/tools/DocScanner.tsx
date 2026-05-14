import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  Camera, Upload, RotateCcw, Check, X, Trash2, Download,
  Plus, Loader2, Filter, Sparkles, Crop as CropIcon, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectDocument, transformPerspective, applyFilter, Point } from '../../lib/cv/scannerCore';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';

declare global {
  interface Window { cv: any; }
}

interface ScannedPage {
  id: string;
  original: string;
  processed: string;
  points: Point[];
  filter: string;
}

const FILTERS = [
  { id: 'original', label: 'Original' },
  { id: 'magic', label: 'Magic' },
  { id: 'enhanced', label: 'Enhanced' },
  { id: 'bw', label: 'B&W' },
  { id: 'grayscale', label: 'Gray' },
];

export const DocScanner: React.FC = () => {
  const [step, setStep] = useState<'start' | 'camera' | 'crop' | 'filter' | 'list'>('start');
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isCVReady, setIsCVReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Processing...');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [imgDims, setImgDims] = useState({ width: 0, height: 0, naturalWidth: 1, naturalHeight: 1 });

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = setInterval(() => {
      if (window.cv && window.cv.imread) {
        setIsCVReady(true);
        clearInterval(check);
      }
    }, 500);
    return () => clearInterval(check);
  }, []);

  const defaultPoints = (w: number, h: number): Point[] => [
    { x: w * 0.08, y: h * 0.08 },
    { x: w * 0.92, y: h * 0.08 },
    { x: w * 0.92, y: h * 0.92 },
    { x: w * 0.08, y: h * 0.92 },
  ];

  const processNewImage = useCallback(async (dataUrl: string) => {
    setLoadingMsg('Detecting document edges...');
    setIsLoading(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });

      let points = defaultPoints(img.width, img.height);

      if (isCVReady) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d')?.drawImage(img, 0, 0);
          const uid = `cv-${Date.now()}`;
          canvas.id = uid;
          document.body.appendChild(canvas);
          const detection = await detectDocument(uid);
          document.body.removeChild(canvas);
          if (detection.found && detection.points.length === 4) {
            points = detection.points;
          }
        } catch {
          // fallback to default
        }
      }

      const newPage: ScannedPage = {
        id: Math.random().toString(36).substr(2, 9),
        original: dataUrl,
        processed: dataUrl,
        points,
        filter: 'original',
      };

      setPages(prev => {
        const updated = [...prev, newPage];
        setCurrentPageIndex(updated.length - 1);
        return updated;
      });
      setStep('crop');
    } catch {
      toast.error('Failed to load image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isCVReady]);

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) { toast.error('Could not capture photo. Please try again.'); return; }
    processNewImage(imageSrc);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) processNewImage(ev.target.result as string); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async () => {
    setLoadingMsg('Applying perspective correction...');
    setIsLoading(true);
    try {
      const page = pages[currentPageIndex];
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = page.original;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);

      let processed = page.original;
      if (isCVReady) {
        try {
          processed = await transformPerspective(canvas, page.points, 1200, 1600);
        } catch {
          toast('Edge correction failed, using original image.', { icon: '⚠️' });
        }
      } else {
        toast('Scanner engine still loading — using original crop.', { icon: 'ℹ️' });
      }

      setPages(prev => {
        const u = [...prev];
        u[currentPageIndex] = { ...u[currentPageIndex], processed };
        return u;
      });
      setStep('filter');
    } catch {
      toast.error('Processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = async (filterType: string) => {
    setLoadingMsg('Applying filter...');
    setIsLoading(true);
    try {
      const page = pages[currentPageIndex];
      let filtered = page.processed;
      if (isCVReady) {
        filtered = await applyFilter(page.processed, filterType as any);
      }
      setPages(prev => {
        const u = [...prev];
        u[currentPageIndex] = { ...u[currentPageIndex], filter: filterType, processed: filtered };
        return u;
      });
    } catch {
      toast.error('Filter failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    setLoadingMsg('Generating PDF...');
    setIsLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const page of pages) {
        // Convert data URL to bytes safely (works on mobile)
        const res = await fetch(page.processed);
        const bytes = new Uint8Array(await res.arrayBuffer());
        let img;
        try { img = await pdfDoc.embedJpg(bytes); }
        catch { img = await pdfDoc.embedPng(bytes); }
        const pdfPage = pdfDoc.addPage([img.width, img.height] as [number, number]);
        pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pdf-scanner-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`PDF with ${pages.length} page(s) exported!`);
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateImgDims = useCallback(() => {
    if (!cropImgRef.current) return;
    const rect = cropImgRef.current.getBoundingClientRect();
    setImgDims({
      width: rect.width,
      height: rect.height,
      naturalWidth: cropImgRef.current.naturalWidth || 1,
      naturalHeight: cropImgRef.current.naturalHeight || 1,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateImgDims);
    return () => window.removeEventListener('resize', updateImgDims);
  }, [updateImgDims]);

  const getRelativePos = (point: Point) => {
    if (!cropImgRef.current || !containerRef.current) return { x: 0, y: 0 };
    const rect = cropImgRef.current.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    return {
      x: (point.x / imgDims.naturalWidth) * rect.width + (rect.left - cRect.left),
      y: (point.y / imgDims.naturalHeight) * rect.height + (rect.top - cRect.top),
    };
  };

  const handlePointMove = (index: number, clientX: number, clientY: number) => {
    if (!cropImgRef.current) return;
    const rect = cropImgRef.current.getBoundingClientRect();
    const x = (Math.max(0, Math.min(clientX - rect.left, rect.width)) / rect.width) * imgDims.naturalWidth;
    const y = (Math.max(0, Math.min(clientY - rect.top, rect.height)) / rect.height) * imgDims.naturalHeight;
    setPages(prev => {
      const u = [...prev];
      const pts = [...u[currentPageIndex].points];
      pts[index] = { x, y };
      u[currentPageIndex] = { ...u[currentPageIndex], points: pts };
      return u;
    });
  };

  const deletePage = (id: string) => {
    setPages(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) setStep('start');
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col pt-20 pb-16">
      <SEO
        title="PDF Scanner - Scan Documents to PDF Free Online"
        description="Free online PDF Scanner. Use your camera or upload photos to scan documents, auto-detect edges, crop, enhance and export professional PDFs instantly."
      />

      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[var(--surface)] p-8 rounded-3xl text-center shadow-2xl border border-[var(--border)] flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              <p className="font-bold text-[var(--foreground)]">{loadingMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto w-full px-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--foreground)] flex items-center gap-2">
              <FileText className="w-7 h-7 text-red-500" />
              PDF Scanner
            </h1>
            <p className="text-[var(--foreground)] opacity-50 text-sm font-medium mt-0.5">
              Scan, crop & export documents as PDF
              {!isCVReady && <span className="ml-2 text-amber-500 text-xs">(Loading AI engine...)</span>}
            </p>
          </div>
          {pages.length > 0 && step === 'list' && (
            <button onClick={generatePDF}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 text-sm whitespace-nowrap">
              <Download className="w-4 h-4" /> Export PDF ({pages.length})
            </button>
          )}
        </div>

        {/* STEP: start */}
        {step === 'start' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
              <button onClick={() => setStep('camera')}
                className="group p-8 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-3xl hover:border-red-500 transition-all text-center flex flex-col items-center gap-5 active:scale-95">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--foreground)] mb-1">Scan with Camera</h3>
                  <p className="text-[var(--foreground)] opacity-50 text-sm">Point camera at any document</p>
                </div>
              </button>

              <button onClick={() => fileInputRef.current?.click()}
                className="group p-8 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-3xl hover:border-red-500 transition-all text-center flex flex-col items-center gap-5 active:scale-95">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--foreground)] mb-1">Upload from Gallery</h3>
                  <p className="text-[var(--foreground)] opacity-50 text-sm">Import photos or images</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                  onChange={handleUpload} className="hidden" />
              </button>
            </div>

            {pages.length > 0 && (
              <button onClick={() => setStep('list')}
                className="mt-6 px-6 py-3 border border-[var(--border)] rounded-2xl font-bold text-[var(--foreground)] opacity-70 hover:opacity-100 transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" /> View {pages.length} scanned page{pages.length > 1 ? 's' : ''}
              </button>
            )}
          </motion.div>
        )}

        {/* STEP: camera */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col bg-black rounded-3xl overflow-hidden relative min-h-[60vh]">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.95}
              videoConstraints={{
                facingMode: { ideal: cameraFacing },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }}
              className="w-full h-full object-cover"
              onUserMediaError={() => toast.error('Camera access denied. Please allow camera permission.')}
            />
            <div className="absolute inset-0 pointer-events-none border-[3px] border-red-500/40 m-8 rounded-2xl" />
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <button onClick={() => setStep('start')} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white"><X className="w-5 h-5" /></button>
              <button onClick={() => setCameraFacing(f => f === 'user' ? 'environment' : 'user')} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white"><RotateCcw className="w-5 h-5" /></button>
            </div>
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <button onClick={handleCapture}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 backdrop-blur-sm active:scale-90 transition-transform">
                <div className="w-14 h-14 bg-white rounded-full" />
              </button>
            </div>
          </div>
        )}

        {/* STEP: crop */}
        {step === 'crop' && pages[currentPageIndex] && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-center text-sm font-semibold opacity-60">Drag the corners to fit around your document</p>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-3 overflow-hidden relative flex items-center justify-center"
              ref={containerRef} style={{ minHeight: '55vh' }}>
              <div className="relative">
                <img ref={cropImgRef} src={pages[currentPageIndex].original} alt="Original document"
                  className="max-h-[55vh] w-auto object-contain select-none"
                  onLoad={updateImgDims} draggable={false} />
                {imgDims.width > 0 && (
                  <>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <polygon
                        points={pages[currentPageIndex].points.map(p => {
                          const pos = getRelativePos(p);
                          return `${pos.x},${pos.y}`;
                        }).join(' ')}
                        fill="rgba(229,9,20,0.12)"
                        stroke="rgba(229,9,20,0.7)"
                        strokeWidth="2.5"
                      />
                    </svg>
                    {pages[currentPageIndex].points.map((p, i) => {
                      const pos = getRelativePos(p);
                      return (
                        <div key={i}
                          className="absolute w-9 h-9 -ml-4 -mt-4 bg-white border-4 border-red-500 rounded-full z-20 flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing touch-none"
                          style={{ left: pos.x, top: pos.y }}
                          onMouseDown={e => {
                            e.preventDefault();
                            const move = (me: MouseEvent) => handlePointMove(i, me.clientX, me.clientY);
                            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                            window.addEventListener('mousemove', move);
                            window.addEventListener('mouseup', up);
                          }}
                          onTouchStart={e => {
                            e.preventDefault();
                            const move = (te: TouchEvent) => handlePointMove(i, te.touches[0].clientX, te.touches[0].clientY);
                            const up = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
                            window.addEventListener('touchmove', move, { passive: false });
                            window.addEventListener('touchend', up);
                          }}
                        >
                          <span className="text-[9px] font-black text-red-600">{i + 1}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { deletePage(pages[currentPageIndex].id); setStep('start'); }}
                className="flex-1 py-4 bg-[var(--surface)] text-[var(--foreground)] font-bold rounded-2xl border border-[var(--border)] flex items-center justify-center gap-2">
                <Trash2 className="w-5 h-5" /> Cancel
              </button>
              <button onClick={handleCropComplete}
                className="flex-2 flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                <Check className="w-5 h-5" /> Process Scan
              </button>
            </div>
          </div>
        )}

        {/* STEP: filter */}
        {step === 'filter' && pages[currentPageIndex] && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex-1 flex flex-col" style={{ minHeight: '50vh' }}>
              <p className="text-xs font-bold opacity-50 uppercase tracking-widest mb-3 text-center">Choose Enhancement Filter</p>
              <div className="flex-1 rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center mb-4">
                <img src={pages[currentPageIndex].processed} alt="Processed document scan"
                  className="max-h-full max-w-full object-contain" />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => handleApplyFilter(f.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${pages[currentPageIndex].filter === f.id ? 'bg-red-500 text-white shadow-lg scale-105' : 'bg-[var(--background)] text-[var(--foreground)] opacity-60 hover:opacity-100'}`}>
                    <Filter className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase leading-none">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('crop')}
                className="flex-1 py-4 bg-[var(--surface)] font-bold rounded-2xl border border-[var(--border)] flex items-center justify-center gap-2 text-[var(--foreground)]">
                <CropIcon className="w-5 h-5" /> Re-crop
              </button>
              <button onClick={() => setStep('list')}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                <Check className="w-5 h-5" /> Save Page
              </button>
            </div>
          </div>
        )}

        {/* STEP: list */}
        {step === 'list' && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg text-[var(--foreground)]">{pages.length} Page{pages.length > 1 ? 's' : ''} Scanned</h2>
              <button onClick={generatePDF}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-md">
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pages.map((page, idx) => (
                <div key={page.id} className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3">
                  <img src={page.processed} alt={`Scanned page ${idx + 1}`}
                    className="aspect-[3/4] rounded-xl object-contain mb-2 bg-black/5 w-full" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold opacity-50">Page {idx + 1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setCurrentPageIndex(idx); setStep('filter'); }}
                        className="p-1.5 hover:bg-[var(--background)] rounded-lg opacity-60 hover:opacity-100 transition-all">
                        <Filter className="w-4 h-4" />
                      </button>
                      <button onClick={() => deletePage(page.id)}
                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg opacity-60 hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setStep('start')}
                className="aspect-[3/4] border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-red-500 transition-all opacity-50 hover:opacity-100">
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
