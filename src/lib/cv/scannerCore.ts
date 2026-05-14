/**
 * Core image processing logic using OpenCV.js for the Smart Document Scanner.
 * Handles edge detection, perspective transformation, and filters.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ContourResult {
  points: Point[];
  found: boolean;
}

declare global {
  interface Window {
    cv: any;
  }
}

/**
 * Detects the document contours in an image.
 */
export async function detectDocument(canvasId: string): Promise<ContourResult> {
  const cv = window.cv;
  if (!cv) return { points: [], found: false };

  let src = cv.imread(canvasId);
  let gray = new cv.Mat();
  let blurred = new cv.Mat();
  let edged = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();

  // 1. Grayscale
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  
  // 2. Blur to remove noise
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  
  // 3. Edge detection
  cv.Canny(blurred, edged, 75, 200);

  // 4. Find contours
  cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let maxContour = null;

  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    let peri = cv.arcLength(cnt, true);
    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

    if (approx.rows === 4 && area > 1000) {
      if (area > maxArea) {
        maxArea = area;
        maxContour = approx;
      }
    } else {
      approx.delete();
    }
  }

  const result: ContourResult = { points: [], found: false };

  if (maxContour) {
    for (let i = 0; i < 4; i++) {
      result.points.push({
        x: maxContour.data32S[i * 2],
        y: maxContour.data32S[i * 2 + 1]
      });
    }
    result.found = true;
    maxContour.delete();
  }

  // Cleanup
  src.delete(); gray.delete(); blurred.delete(); edged.delete();
  contours.delete(); hierarchy.delete();

  return result;
}

/**
 * Performs perspective transform to "flatten" the document.
 */
export async function transformPerspective(
  srcCanvas: HTMLCanvasElement,
  points: Point[],
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const cv = window.cv;
  if (!cv) return "";

  let src = cv.imread(srcCanvas);
  let dst = new cv.Mat();
  
  // Sort points: top-left, top-right, bottom-right, bottom-left
  const sortedPoints = sortPoints(points);
  
  let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    sortedPoints[0].x, sortedPoints[0].y,
    sortedPoints[1].x, sortedPoints[1].y,
    sortedPoints[2].x, sortedPoints[2].y,
    sortedPoints[3].x, sortedPoints[3].y
  ]);

  let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    targetWidth, 0,
    targetWidth, targetHeight,
    0, targetHeight
  ]);

  let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  cv.warpPerspective(src, dst, M, new cv.Size(targetWidth, targetHeight));

  // Create a temporary canvas to output the data
  const outCanvas = document.createElement('canvas');
  cv.imshow(outCanvas, dst);
  const dataUrl = outCanvas.toDataURL('image/jpeg', 0.9);

  // Cleanup
  src.delete(); dst.delete(); M.delete(); srcCoords.delete(); dstCoords.delete();

  return dataUrl;
}

/**
 * Applies document enhancement filters.
 */
export async function applyFilter(
  imgDataUrl: string,
  filterType: 'original' | 'enhanced' | 'bw' | 'grayscale' | 'magic'
): Promise<string> {
  const cv = window.cv;
  if (!cv || filterType === 'original') return imgDataUrl;

  const img = await loadImage(imgDataUrl);
  let src = cv.imread(img);
  let dst = new cv.Mat();

  switch (filterType) {
    case 'grayscale':
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
      break;
    case 'bw':
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
      cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
      break;
    case 'enhanced':
      // Basic contrast/brightness enhancement
      src.convertTo(dst, -1, 1.2, 10);
      break;
    case 'magic':
      // Combination of sharpening and contrast
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.adaptiveThreshold(gray, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 8);
      gray.delete();
      break;
  }

  const outCanvas = document.createElement('canvas');
  cv.imshow(outCanvas, dst);
  const result = outCanvas.toDataURL('image/jpeg', 0.9);

  src.delete(); dst.delete();
  return result;
}

function sortPoints(points: Point[]): Point[] {
  // Sort by y-coordinate to separate top and bottom
  const sortedByY = [...points].sort((a, b) => a.y - b.y);
  const top = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sortedByY.slice(2, 4).sort((a, b) => b.x - a.x);
  return [top[0], top[1], bottom[0], bottom[1]];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}
