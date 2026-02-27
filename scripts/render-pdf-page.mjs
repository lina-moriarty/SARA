import { readFileSync, writeFileSync } from 'fs';
import { createCanvas } from 'canvas';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

async function renderPage(pdfPath, pageNum, outPath, scale = 1.5) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await getDocument({ data, useSystemFonts: true, disableWorker: true }).promise;
  console.error('Total pages:', pdf.numPages);
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  writeFileSync(outPath, canvas.toBuffer('image/jpeg', { quality: 0.85 }));
  console.error('Written:', outPath);
}

const pdfPath = process.argv[2];
const pageNum = parseInt(process.argv[3] || '1');
const outPath = process.argv[4] || '/tmp/page_out.jpg';
const scale = parseFloat(process.argv[5] || '1.5');

renderPage(pdfPath, pageNum, outPath, scale).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
