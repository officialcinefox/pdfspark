import type { Point } from './scannerCore';

/** Sort 4 points into [topLeft, topRight, bottomRight, bottomLeft] */
function sortCorners(pts: Point[]): [Point, Point, Point, Point] {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bot[1], bot[0]]; // TL, TR, BR, BL
}

/** Bilinear perspective warp — works on all browsers, no dependencies */
export function perspectiveWarpCanvas(
  src: HTMLCanvasElement,
  corners: Point[],
  dstW: number,
  dstH: number
): HTMLCanvasElement {
  const [tl, tr, br, bl] = sortCorners(corners);
  const dst = document.createElement('canvas');
  dst.width = dstW;
  dst.height = dstH;
  const dstCtx = dst.getContext('2d')!;
  const srcCtx = src.getContext('2d')!;
  const srcImg = srcCtx.getImageData(0, 0, src.width, src.height);
  const dstImg = dstCtx.createImageData(dstW, dstH);
  const sw = src.width, sh = src.height;

  for (let dy = 0; dy < dstH; dy++) {
    const v = dy / (dstH - 1);
    for (let dx = 0; dx < dstW; dx++) {
      const u = dx / (dstW - 1);
      const sx = Math.round((1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x);
      const sy = Math.round((1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y);
      if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
        const si = (sy * sw + sx) * 4;
        const di = (dy * dstW + dx) * 4;
        dstImg.data[di] = srcImg.data[si];
        dstImg.data[di + 1] = srcImg.data[si + 1];
        dstImg.data[di + 2] = srcImg.data[si + 2];
        dstImg.data[di + 3] = 255;
      }
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return dst;
}

/** Apply document filters using pure canvas — no OpenCV needed */
export function applyFilterCanvas(dataUrl: string, filter: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      if (filter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, 0, 0);
      } else if (filter === 'enhanced') {
        ctx.filter = 'contrast(135%) brightness(108%) saturate(90%)';
        ctx.drawImage(img, 0, 0);
      } else if (filter === 'bw' || filter === 'magic') {
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const threshold = filter === 'magic' ? 185 : 128;
        for (let i = 0; i < d.data.length; i += 4) {
          const v = d.data[i] > threshold ? 255 : 0;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        }
        ctx.putImageData(d, 0, 0);
      } else {
        ctx.drawImage(img, 0, 0);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

/** Convert a dataURL to Uint8Array safely (works on mobile) */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
