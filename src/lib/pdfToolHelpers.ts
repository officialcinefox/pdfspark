import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const A4: [number, number] = [595.28, 841.89]
const LETTER: [number, number] = [612, 792]
const SAFE_TEXT = /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g

export const PDF_ACCEPT = { 'application/pdf': ['.pdf'] }
export const TEXT_ACCEPT = { 'text/plain': ['.txt'] }
export const HTML_ACCEPT = { 'text/html': ['.html', '.htm'], 'text/plain': ['.txt'] }
export const DOC_ACCEPT = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt']
}
export const SHEET_ACCEPT = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt', '.csv']
}
export const PRESENTATION_ACCEPT = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function bytesToBlob(bytes: Uint8Array, type: string = 'application/pdf') {
  return new Blob([bytes], { type })
}

export function downloadBytes(bytes: Uint8Array, filename: string, type: string = 'application/pdf') {
  downloadBlob(bytesToBlob(bytes, type), filename)
}

export function baseName(file: File) {
  return file.name.replace(/\.[^.]+$/, '')
}

export async function loadPdf(file: File, ignoreEncryption = true, password?: string) {
  return PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption, password } as any)
}

export async function savePdf(pdf: PDFDocument, filename: string) {
  downloadBytes(await pdf.save({ useObjectStreams: true }), filename)
}

export function parsePageSelection(input: string, total: number, fallbackAll = false) {
  const value = input.trim()
  if (!value) {
    return fallbackAll ? Array.from({ length: total }, (_, index) => index) : []
  }

  const pages: number[] = []
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)

  for (const part of parts) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const start = Number(range[1])
      const end = Number(range[2])
      if (start < 1 || end > total || start > end) {
        throw new Error(`Use page numbers between 1 and ${total}`)
      }
      for (let page = start; page <= end; page += 1) {
        pages.push(page - 1)
      }
      continue
    }

    const page = Number(part)
    if (!Number.isInteger(page) || page < 1 || page > total) {
      throw new Error(`Use page numbers between 1 and ${total}`)
    }
    pages.push(page - 1)
  }

  return pages
}

export function uniqueSorted(indices: number[]) {
  return Array.from(new Set(indices)).sort((a, b) => a - b)
}

export function safePdfText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(SAFE_TEXT, '?')
}

export function stripHtml(html: string) {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|section|article|header|footer|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeXmlEntities(withoutBlocks).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export async function createPdfFromText(title: string, text: string, filename: string) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageSize = A4
  const margin = 48
  const fontSize = 11
  const lineHeight = 16
  let page = pdf.addPage(pageSize)
  let y = page.getHeight() - margin

  page.drawText(safePdfText(title), {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0.05, 0.1, 0.2)
  })
  y -= 30

  const drawLine = (line: string) => {
    if (y < margin) {
      page = pdf.addPage(pageSize)
      y = page.getHeight() - margin
    }
    page.drawText(safePdfText(line), {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.12, 0.16)
    })
    y -= lineHeight
  }

  for (const paragraph of text.replace(/\t/g, '    ').split('\n')) {
    if (!paragraph.trim()) {
      y -= lineHeight
      continue
    }
    for (const line of wrapText(paragraph, font, fontSize, page.getWidth() - margin * 2)) {
      drawLine(line)
    }
  }

  await savePdf(pdf, filename)
}

export function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = safePdfText(text).split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      line = candidate
      continue
    }

    if (line) lines.push(line)

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      line = word
    } else {
      const chunks = splitLongWord(word, font, fontSize, maxWidth)
      lines.push(...chunks.slice(0, -1))
      line = chunks[chunks.length - 1] ?? ''
    }
  }

  if (line) lines.push(line)
  return lines
}

function splitLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const chunks: string[] = []
  let chunk = ''

  for (const char of word) {
    if (font.widthOfTextAtSize(chunk + char, fontSize) <= maxWidth) {
      chunk += char
    } else {
      if (chunk) chunks.push(chunk)
      chunk = char
    }
  }

  if (chunk) chunks.push(chunk)
  return chunks
}

export async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjsLib.getDocument({ data })
  const pdf = await task.promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items.map((item: any) => item.str ?? '').join(' ').replace(/\s+/g, ' ').trim()
    pages.push(`Page ${pageNumber}\n${text}`)
  }

  return pages.join('\n\n')
}

export async function renderPdfPagesToPng(file: File, pagesInput: string, scale = 2) {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjsLib.getDocument({ data })
  const pdf = await task.promise
  const pageIndices = parsePageSelection(pagesInput, pdf.numPages, true)
  const zip = new JSZip()
  const name = baseName(file)

  for (const pageIndex of pageIndices) {
    const page = await pdf.getPage(pageIndex + 1)
    
    // Explicitly handle rotation from page metadata
    const viewport = page.getViewport({ scale, rotation: page.rotate })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not create a canvas')

    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    
    await page.render({ 
      canvasContext: context, 
      viewport,
      canvas
    }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not create image')), 'image/png')
    })

    if (pageIndices.length === 1) {
      downloadBlob(blob, `${name}-page-${pageIndex + 1}.png`)
    } else {
      zip.file(`${name}-page-${pageIndex + 1}.png`, blob)
    }
  }

  if (pageIndices.length > 1) {
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(zipBlob, `${name}-images.zip`)
  }
}

export function drawCenteredText(page: PDFPage, text: string, font: PDFFont, size: number, y: number) {
  const safe = safePdfText(text)
  const width = font.widthOfTextAtSize(safe, size)
  page.drawText(safe, {
    x: (page.getWidth() - width) / 2,
    y,
    size,
    font,
    color: rgb(0.1, 0.12, 0.16)
  })
}

export async function fileToText(file: File) {
  return file.text()
}

export async function officeFileToText(file: File) {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.docx')) return extractDocxText(await file.arrayBuffer())
  if (lower.endsWith('.xlsx')) return extractXlsxText(await file.arrayBuffer())
  if (lower.endsWith('.pptx')) return extractPptxText(await file.arrayBuffer())
  return file.text()
}

export async function officeFileToRows(file: File) {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx')) return extractXlsxRows(await file.arrayBuffer())

  const rows = (await file.text())
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()))
  return rows.length ? rows : [[await file.text()]]
}

function decodeXmlEntities(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function extractDocxText(buffer: ArrayBuffer) {
  const documentXml = await unzipText(buffer, 'word/document.xml')
  return xmlTextNodes(documentXml.replace(/<\/w:p>/g, '\n'))
}

async function extractPptxText(buffer: ArrayBuffer) {
  const entries = await unzipEntries(buffer)
  const slideNames = Object.keys(entries)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))

  const slides: string[] = []
  for (const name of slideNames) {
    slides.push(xmlTextNodes(await readZipEntry(buffer, entries[name])))
  }
  return slides.map((slide, index) => `Slide ${index + 1}\n${slide}`).join('\n\n')
}

async function extractXlsxText(buffer: ArrayBuffer) {
  const rows = await extractXlsxRows(buffer)
  return rows.map((row) => row.join('\t')).join('\n')
}

async function extractXlsxRows(buffer: ArrayBuffer) {
  const entries = await unzipEntries(buffer)
  const shared = entries['xl/sharedStrings.xml']
    ? parseSharedStrings(await readZipEntry(buffer, entries['xl/sharedStrings.xml']))
    : []

  const sheetNames = Object.keys(entries)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))

  const rows: string[][] = []
  for (const sheetName of sheetNames) {
    rows.push(...parseSheetRows(await readZipEntry(buffer, entries[sheetName]), shared))
    rows.push([])
  }
  return rows.filter((row) => row.length > 0)
}

function xmlTextNodes(xml: string) {
  return Array.from(xml.matchAll(/<[^:>]*:?t(?:\s[^>]*)?>([\s\S]*?)<\/[^:>]*:?t>/g))
    .map((match) => decodeXmlEntities(match[1]))
    .join(' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function parseSharedStrings(xml: string) {
  return Array.from(xml.matchAll(/<si[\s\S]*?<\/si>/g)).map((match) => xmlTextNodes(match[0]))
}

function parseSheetRows(xml: string, sharedStrings: string[]) {
  return Array.from(xml.matchAll(/<row[\s\S]*?<\/row>/g)).map((rowMatch) => {
    const cells = Array.from(rowMatch[0].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)).map((cellMatch) => {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const shared = /\st="s"/.test(attrs)
      const inline = /\st="inlineStr"/.test(attrs)
      if (inline) return xmlTextNodes(body)
      const value = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? ''
      return shared ? sharedStrings[Number(value)] ?? '' : decodeXmlEntities(value)
    })
    return cells
  })
}

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

async function unzipText(buffer: ArrayBuffer, filename: string) {
  const entries = await unzipEntries(buffer)
  const entry = entries[filename]
  if (!entry) throw new Error(`${filename} was not found inside the file`)
  return readZipEntry(buffer, entry)
}

async function unzipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const decoder = new TextDecoder()
  const eocdOffset = findEndOfCentralDirectory(view)
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true)
  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const entries: Record<string, ZipEntry> = {}
  let offset = centralDirectoryOffset

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid Office file')
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength))

    entries[name] = { name, method, compressedSize, uncompressedSize, localHeaderOffset }
    offset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function findEndOfCentralDirectory(view: DataView) {
  const minOffset = Math.max(0, view.byteLength - 66000)
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  throw new Error('Could not read Office file')
}

async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer)
  if (view.getUint32(entry.localHeaderOffset, true) !== 0x04034b50) {
    throw new Error('Invalid Office file entry')
  }

  const nameLength = view.getUint16(entry.localHeaderOffset + 26, true)
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true)
  const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength
  const compressed = new Uint8Array(buffer, dataStart, entry.compressedSize)

  if (entry.method === 0) {
    return new TextDecoder().decode(compressed)
  }

  if (entry.method !== 8) {
    throw new Error('Unsupported Office compression method')
  }

  const DecompressionStreamCtor = (globalThis as any).DecompressionStream
  if (!DecompressionStreamCtor) {
    throw new Error('This browser cannot read compressed Office files')
  }

  const stream = bytesToBlob(compressed, 'application/octet-stream').stream().pipeThrough(new DecompressionStreamCtor('deflate-raw'))
  const decompressed = await new Response(stream).arrayBuffer()
  if (entry.uncompressedSize && decompressed.byteLength !== entry.uncompressedSize) {
    return new TextDecoder().decode(decompressed)
  }
  return new TextDecoder().decode(decompressed)
}

export function pageSizeFromName(name: string): [number, number] {
  return name === 'letter' ? LETTER : A4
}
