import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  Camera, Upload, RotateCcw, Check, X, Trash2,
  Download, Plus, Loader2, Filter, FileText, CropIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectDocument, transformPerspective, applyFilter, Point } from '../../lib/cv/scannerCore';
import { perspectiveWarpCanvas, applyFilterCanvas, dataUrlToBytes } from '../../lib/cv/canvasFallback';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';

declare global { interface Window { cv: any; } }

interface ScannedPage {
  id: string;
  original: string;
  processed: string;
  points: Point[];
  filter: string;
}

const FILTERS = [
  { id: 'original', label: 'Original' },
  { id: 'magic',    label: 'Magic'    },
  { id: 'enhanced', label: 'Enhance'  },
  { id: 'bw',       label: 'B&W'      },
  { id: 'grayscale',label: 'Gray'     },
];

function makeDefaultPoints(w: number, h: number): Point[] {
  return [
    { x: w * 0.08, y: h * 0.08 },
    { x: w * 0.92, y: h * 0.08 },
    { x: w * 0.92, y: h * 0.92 },
    { x: w * 0.08, y: h * 0.92 },
  ];
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export const DocScanner: React.FC = () => {
  const [step, setStep] = useState<'start'|'camera'|'crop'|'filter'|'list'>('start');
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [cvReady, setCvReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('Processing…');
  const [facing, setFacing] = useState<'user'|'environment'>('environment');
  const [imgDims, setImgDims] = useState({ w: 0, h: 0, nw: 1, nh: 1 });

  const camRef  = useRef<Webcam>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);
  const boxRef  = useRef<HTMLDivElement>(null);

  /* Check OpenCV */
  useEffect(() => {
    const t = setInterval(() => {
      if (window.cv?.imread) { setCvReady(true); clearInterval(t); }
    }, 400);
    return () => clearInterval(t);
  }, []);

  /* ---------- helpers ---------- */
  const busy_ = (msg: string, fn: () => Promise<void>) => async () => {
    setBusyMsg(msg); setBusy(true);
    try { await fn(); } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  /* ---------- processImage ---------- */
  const processImage = useCallback(async (dataUrl: string) => {
    setBusyMsg('Detecting edges…'); setBusy(true);
    try {
      const img = await loadImg(dataUrl);
      let pts = makeDefaultPoints(img.width, img.height);

      if (cvReady) {
        try {
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          c.getContext('2d')!.drawImage(img, 0, 0);
          const uid = `cv${Date.now()}`;
          c.id = uid;
          document.body.appendChild(c);
          const det = await detectDocument(uid);
          document.body.removeChild(c);
          if (det.found && det.points.length === 4) pts = det.points;
        } catch { /* keep defaults */ }
      }

      const page: ScannedPage = {
        id: Math.random().toString(36).slice(2),
        original: dataUrl,
        processed: dataUrl,
        points: pts,
        filter: 'original',
      };
      setPages(prev => { const n = [...prev, page]; setPageIdx(n.length - 1); return n; });
      setStep('crop');
    } finally { setBusy(false); }
  }, [cvReady]);

  /* ---------- camera ---------- */
  const capture = () => {
    const src = camRef.current?.getScreenshot();
    if (!src) { toast.error('Could not capture. Try again.'); return; }
    processImage(src);
  };

  /* ---------- upload ---------- */
  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => { if (ev.target?.result) processImage(ev.target.result as string); };
    r.readAsDataURL(file);
    e.target.value = '';
  };

  /* ---------- crop done ---------- */
  const cropDone = busy_('Correcting perspective…', async () => {
    const page = pages[pageIdx];
    const img  = await loadImg(page.original);
    const c    = document.createElement('canvas');
    c.width    = img.width; c.height = img.height;
    c.getContext('2d')!.drawImage(img, 0, 0);

    let processed = page.original;
    try {
      if (cvReady) {
        processed = await transformPerspective(c, page.points, 1200, 1600);
      } else {
        const out = perspectiveWarpCanvas(c, page.points, 900, 1200);
        processed = out.toDataURL('image/jpeg', 0.92);
      }
    } catch { toast('Could not correct perspective — using crop.', { icon: '⚠️' }); }

    setPages(prev => { const u=[...prev]; u[pageIdx]={...u[pageIdx],processed}; return u; });
    setStep('filter');
  });

  /* ---------- filter ---------- */
  const applyF = (f: string) => busy_(`Applying ${f}…`, async () => {
    const page = pages[pageIdx];
    let out = page.processed;
    try {
      if (cvReady) out = await applyFilter(page.processed, f as any);
      else         out = await applyFilterCanvas(page.processed, f);
    } catch { /* keep current */ }
    setPages(prev => { const u=[...prev]; u[pageIdx]={...u[pageIdx],filter:f,processed:out}; return u; });
  })();

  /* ---------- generate PDF ---------- */
  const genPDF = busy_('Generating PDF…', async () => {
    const pdf = await PDFDocument.create();
    for (const pg of pages) {
      const bytes = dataUrlToBytes(pg.processed);
      let emb;
      try { emb = await pdf.embedJpg(bytes); }
      catch { emb = await pdf.embedPng(bytes); }
      const p = pdf.addPage([emb.width, emb.height] as [number,number]);
      p.drawImage(emb, { x:0, y:0, width:emb.width, height:emb.height });
    }
    const blob = new Blob([await pdf.save()], { type:'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href:url, download:`pdf-scanner-${Date.now()}.pdf` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`✅ ${pages.length} page PDF exported!`);
  });

  /* ---------- crop UI helpers ---------- */
  const updateDims = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setImgDims({ w: r.width, h: r.height, nw: el.naturalWidth||1, nh: el.naturalHeight||1 });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, [updateDims]);

  const relPos = (pt: Point) => {
    if (!imgRef.current || !boxRef.current) return { x:0, y:0 };
    const ir = imgRef.current.getBoundingClientRect();
    const br = boxRef.current.getBoundingClientRect();
    return {
      x: (pt.x / imgDims.nw) * ir.width  + (ir.left - br.left),
      y: (pt.y / imgDims.nh) * ir.height + (ir.top  - br.top ),
    };
  };

  const movePoint = (i: number, cx: number, cy: number) => {
    const ir = imgRef.current?.getBoundingClientRect();
    if (!ir) return;
    const x = (Math.max(0, Math.min(cx - ir.left, ir.width )) / ir.width ) * imgDims.nw;
    const y = (Math.max(0, Math.min(cy - ir.top,  ir.height)) / ir.height) * imgDims.nh;
    setPages(prev => {
      const u = [...prev];
      const pts = [...u[pageIdx].points];
      pts[i] = { x, y };
      u[pageIdx] = { ...u[pageIdx], points: pts };
      return u;
    });
  };

  const delPage = (id: string) => setPages(prev => {
    const n = prev.filter(p => p.id !== id);
    if (!n.length) setStep('start');
    return n;
  });

  const cur = pages[pageIdx];

  /* ======= RENDER ======= */
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col pt-20 pb-16">
      <SEO
        title="PDF Scanner — Free Online Document Scanner"
        description="Scan documents with your camera or upload photos. Auto-detect edges, correct perspective, apply filters and export professional PDFs — 100% free, no sign-up."
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {busy && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              <p className="font-bold text-[var(--foreground)]">{busyMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto w-full px-4 flex-1 flex flex-col">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--foreground)] flex items-center gap-2">
              <FileText className="w-7 h-7 text-red-500" /> PDF Scanner
            </h1>
            <p className="text-sm opacity-50 mt-0.5">
              Scan, crop &amp; export documents as PDF
              {!cvReady && <span className="ml-2 text-amber-500 text-[11px]">· Loading AI engine…</span>}
            </p>
          </div>
          {pages.length > 0 && step === 'list' && (
            <button onClick={genPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/20 transition-all active:scale-95">
              <Download className="w-4 h-4" /> Export PDF ({pages.length})
            </button>
          )}
        </div>

        {/* ── STEP: start ── */}
        {step === 'start' && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">

              {/* Camera */}
              <button onClick={() => setStep('camera')}
                className="group p-8 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-3xl hover:border-red-500 transition-all flex flex-col items-center gap-5 active:scale-95 select-none">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-[var(--foreground)]">Scan with Camera</p>
                  <p className="text-sm opacity-50 mt-1">Use your device camera</p>
                </div>
              </button>

              {/* Upload */}
              <button onClick={() => fileRef.current?.click()}
                className="group p-8 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-3xl hover:border-red-500 transition-all flex flex-col items-center gap-5 active:scale-95 select-none">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-[var(--foreground)]">Upload Image</p>
                  <p className="text-sm opacity-50 mt-1">From gallery or files</p>
                </div>
              </button>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} multiple={false} />
            </div>

            {pages.length > 0 && (
              <button onClick={() => setStep('list')}
                className="flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] rounded-2xl text-sm font-bold opacity-60 hover:opacity-100 transition-all">
                <FileText className="w-4 h-4" /> View {pages.length} scanned page{pages.length > 1 ? 's' : ''}
              </button>
            )}
          </motion.div>
        )}

        {/* ── STEP: camera ── */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col bg-black rounded-3xl overflow-hidden relative" style={{minHeight:'60vh'}}>
            <Webcam
              ref={camRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.95}
              videoConstraints={{ facingMode: { ideal: facing }, width:{ideal:1920}, height:{ideal:1080} }}
              className="absolute inset-0 w-full h-full object-cover"
              onUserMediaError={() => toast.error('Camera permission denied.')}
            />
            {/* viewfinder */}
            <div className="absolute inset-8 border-2 border-white/30 rounded-2xl pointer-events-none" />
            {/* controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
              <button onClick={() => setStep('start')} className="p-3 bg-black/50 backdrop-blur rounded-full text-white"><X className="w-5 h-5"/></button>
              <button onClick={() => setFacing(f => f==='user'?'environment':'user')} className="p-3 bg-black/50 backdrop-blur rounded-full text-white"><RotateCcw className="w-5 h-5"/></button>
            </div>
            {/* shutter */}
            <div className="absolute bottom-8 inset-x-0 flex justify-center z-10">
              <button onClick={capture} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform">
                <div className="w-14 h-14 rounded-full bg-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: crop ── */}
        {step === 'crop' && cur && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-center text-xs font-semibold opacity-50 uppercase tracking-widest">
              Drag corners to align with document edges
            </p>
            <div ref={boxRef}
              className="relative bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden flex items-center justify-center"
              style={{minHeight:'55vh'}}>
              <div className="relative">
                <img ref={imgRef} src={cur.original} alt="Document to crop"
                  className="max-h-[55vh] max-w-full object-contain select-none"
                  onLoad={updateDims} draggable={false} />

                {imgDims.w > 0 && (<>
                  {/* polygon overlay */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <polygon
                      points={cur.points.map(p=>{ const r=relPos(p); return `${r.x},${r.y}`; }).join(' ')}
                      fill="rgba(229,9,20,0.12)" stroke="rgba(229,9,20,0.75)" strokeWidth="2.5"
                    />
                  </svg>
                  {/* corner handles */}
                  {cur.points.map((p, i) => {
                    const r = relPos(p);
                    return (
                      <div key={i}
                        className="absolute w-9 h-9 -ml-[18px] -mt-[18px] bg-white border-4 border-red-500 rounded-full z-20 flex items-center justify-center shadow-xl cursor-grab touch-none select-none"
                        style={{ left: r.x, top: r.y }}
                        onMouseDown={e => {
                          e.preventDefault();
                          const mv = (me: MouseEvent) => movePoint(i, me.clientX, me.clientY);
                          const up = () => { window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
                          window.addEventListener('mousemove',mv);
                          window.addEventListener('mouseup',up);
                        }}
                        onTouchStart={e => {
                          e.preventDefault();
                          const mv = (te: TouchEvent) => movePoint(i, te.touches[0].clientX, te.touches[0].clientY);
                          const up = () => { window.removeEventListener('touchmove',mv as any); window.removeEventListener('touchend',up); };
                          window.addEventListener('touchmove', mv as any, { passive:false });
                          window.addEventListener('touchend', up);
                        }}
                      >
                        <span className="text-[9px] font-black text-red-600 leading-none">{i+1}</span>
                      </div>
                    );
                  })}
                </>)}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { delPage(cur.id); setStep('start'); }}
                className="flex-1 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl font-bold flex items-center justify-center gap-2 text-[var(--foreground)]">
                <Trash2 className="w-5 h-5" /> Cancel
              </button>
              <button onClick={cropDone}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95">
                <Check className="w-5 h-5" /> Process Scan
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: filter ── */}
        {step === 'filter' && cur && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex-1 flex flex-col gap-4" style={{minHeight:'50vh'}}>
              <p className="text-center text-xs font-semibold opacity-50 uppercase tracking-widest">Choose Enhancement</p>
              <div className="flex-1 rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center">
                <img src={cur.processed} alt="Scanned document processed"
                  className="max-h-full max-w-full object-contain" />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => applyF(f.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-xs font-black uppercase ${cur.filter===f.id ? 'bg-red-500 text-white scale-105 shadow-lg' : 'bg-[var(--background)] opacity-60 hover:opacity-100'}`}>
                    <Filter className="w-4 h-4" />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('crop')}
                className="flex-1 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl font-bold flex items-center justify-center gap-2 text-[var(--foreground)]">
                <CropIcon className="w-5 h-5" /> Re-crop
              </button>
              <button onClick={() => { setStep('list'); }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95">
                <Check className="w-5 h-5" /> Save Page
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: list ── */}
        {step === 'list' && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-black text-xl text-[var(--foreground)]">{pages.length} Page{pages.length!==1?'s':''} Ready</h2>
              <button onClick={genPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pages.map((pg, i) => (
                <div key={pg.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3">
                  <img src={pg.processed} alt={`Scanned page ${i+1}`}
                    className="w-full aspect-[3/4] rounded-xl object-contain bg-black/5 mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold opacity-50">Page {i+1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setPageIdx(i); setStep('filter'); }}
                        className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-[var(--background)] transition-all">
                        <Filter className="w-4 h-4" />
                      </button>
                      <button onClick={() => delPage(pg.id)}
                        className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setStep('start')}
                className="aspect-[3/4] border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-red-500 opacity-50 hover:opacity-100 transition-all active:scale-95">
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
