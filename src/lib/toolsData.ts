import React from 'react'

export interface Tool {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  iconSrc: string
  path: string
  color: string
}

export interface ToolCategory {
  slug: string
  title: string
  description: string
  homeDescription: string
  tools: Tool[]
}

const ICON_FRAME = 'bg-white/90 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10'

function iconSrc(id: string) {
  return `/assets/tool-icons/${id}.png`
}

function toolIcon(id: string, title: string) {
  return React.createElement('img', {
    src: iconSrc(id),
    alt: '',
    'aria-hidden': true,
    className: 'w-10 h-10 object-contain drop-shadow-sm',
    loading: 'lazy',
    decoding: 'async',
    title
  })
}

function tool(id: string, title: string, description: string): Tool {
  return {
    id,
    title,
    description,
    icon: toolIcon(id, title),
    iconSrc: iconSrc(id),
    path: `/tool/${id}`,
    color: ICON_FRAME
  }
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    slug: 'pdf-management',
    title: 'PDF Management',
    description: 'Organize, optimize, and manage your PDF pages with ease.',
    homeDescription: 'Organize and control PDF pages with clean workflows for merging, splitting, rotating, and preparing documents for sharing.',
    tools: [
      tool('scan-document', 'Smart Scanner', 'Scan documents with camera & auto-detect edges.'),
      tool('merge', 'Merge PDF', 'Combine multiple PDFs into one unified document.'),
      tool('split', 'Split PDF', 'Extract pages or split a PDF into multiple files.'),
      tool('compress', 'Compress PDF', 'Reduce file size while maintaining high quality.'),
      tool('rotate', 'Rotate PDF', 'Rotate your PDFs the way you need them.'),
      tool('delete-pages', 'Delete Pages', 'Remove unnecessary pages from your PDF.'),
      tool('reorder-pages', 'Reorder Pages', 'Drag and drop to rearrange PDF pages.'),
      tool('duplicate-pages', 'Duplicate Pages', 'Clone specific pages within your PDF.'),
      tool('insert-blank-page', 'Insert Blank Page', 'Add empty pages wherever you need them.'),
      tool('extract-pages', 'Extract Pages', 'Save specific pages as a new PDF file.'),
      tool('crop-pdf', 'Crop PDF', 'Trim margins or specific areas of PDF pages.'),
      tool('organize-pdf', 'Organize PDF', 'Comprehensive page management in one view.')
    ]
  },
  {
    slug: 'conversion-tools',
    title: 'Conversion Tools',
    description: 'Convert to and from PDF without losing formatting.',
    homeDescription: 'Convert images, Office files, and text into professional PDFs while keeping the workflow simple and fast.',
    tools: [
      tool('image-to-pdf', 'Image to PDF', 'Convert JPG, PNG, and more to PDF.'),
      tool('pdf-to-image', 'PDF to Image', 'Extract pages as high-quality images.'),
      tool('word-to-pdf', 'Word to PDF', 'Convert DOCX files to professional PDFs.'),
      tool('pdf-to-word', 'PDF to Word', 'Convert PDF back to editable Word docs.'),
      tool('pdf-to-text', 'PDF to Text', 'Extract plain text from your PDF files.'),
      tool('excel-to-pdf', 'Excel to PDF', 'Convert spreadsheets to PDF tables.'),
      tool('pdf-to-excel', 'PDF to Excel', 'Convert PDF tables to Excel sheets.'),
      tool('powerpoint-to-pdf', 'PowerPoint to PDF', 'Convert presentations to PDF slides.'),
      tool('pdf-to-powerpoint', 'PDF to PowerPoint', 'Convert PDF to editable PPTX slides.'),
      tool('text-to-pdf', 'Text to PDF', 'Convert plain text files to PDF.'),
      tool('html-to-pdf', 'HTML to PDF', 'Convert webpages or HTML to PDF.')
    ]
  },
  {
    slug: 'security-tools',
    title: 'Security Tools',
    description: 'Protect your sensitive documents and verify identity.',
    homeDescription: 'Protect sensitive files, unlock documents, and add secure signatures when privacy and access control matter most.',
    tools: [
      tool('lock', 'Lock PDF', 'Encrypt your PDF with a strong password.'),
      tool('unlock', 'Unlock PDF', 'Remove password and security restrictions.'),
      tool('digital-signature', 'Digital Signature', 'Sign PDFs with a secure digital signature.'),
      tool('remove-restrictions', 'Remove Restrictions', 'Remove printing and copying limitations.')
    ]
  },
  {
    slug: 'editing-tools',
    title: 'Editing Tools',
    description: 'Modify content, add annotations, and style your PDFs.',
    homeDescription: 'Add watermarks, page numbers, and highlights so your PDFs are easier to review, share, and finish.',
    tools: [
      tool('watermark', 'Add Watermark', 'Stamp text or images over your PDF.'),
      tool('page-numbers', 'Add Page Numbers', 'Insert customizable page numbering.'),
      tool('highlight-text', 'Highlight Text', 'Mark important sections in your PDF.'),
      tool('add-notes', 'Add Notes', 'Add sticky notes and comments.'),
      tool('draw-on-pdf', 'Draw on PDF', 'Freehand drawing and annotations.'),
      tool('add-shapes', 'Add Shapes', 'Insert circles, rectangles, and arrows.'),
      tool('fill-forms', 'Fill Forms', 'Fill out interactive PDF forms.'),
      tool('edit-text', 'Edit Existing Text', 'Modify text content directly in PDF.')
    ]
  }
]

export const ALL_TOOLS = TOOL_CATEGORIES.flatMap((category) => category.tools)

export function getToolById(id: string) {
  return ALL_TOOLS.find((item) => item.id === id)
}

export function getCategoryBySlug(slug: string) {
  return TOOL_CATEGORIES.find((category) => category.slug === slug)
}

export function getCategoryPath(category: ToolCategory) {
  return `/tools/${category.slug}`
}
