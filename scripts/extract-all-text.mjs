/**
 * Extracts all text from a PDF, one page at a time, returning the full text.
 * Usage: node scripts/extract-all-text.mjs "path/to/file.pdf"
 * Outputs: JSON array of page texts
 */
import { readFileSync } from 'fs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

async function extractAllText(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  
  console.log(JSON.stringify(pages));
}

const pdfPath = process.argv[2];
extractAllText(pdfPath).catch(e => { console.error('Error:', e.message); process.exit(1); });
