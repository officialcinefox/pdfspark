import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import os from 'os';

const uploadDir = path.join(os.tmpdir(), 'pdfspark-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PDF Spark API is running' });
  });

  // Example backend tool route for heavy processing if needed
  // Most tools will be implemented purely client-side for maximum speed and privacy
  app.post('/api/tools/merge', upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        const fileBytes = await fs.promises.readFile(file.path);
        const pdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        // Cleanup temp file
        await fs.promises.unlink(file.path).catch(console.error);
      }

      const pdfBytes = await mergedPdf.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
      res.send(Buffer.from(pdfBytes));

    } catch (err) {
      console.error('Merge Error:', err);
      res.status(500).json({ error: 'Failed to process PDF' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Note: express.static in Express 5 will still work, but app.get('*') may need '*' for wildcard
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
