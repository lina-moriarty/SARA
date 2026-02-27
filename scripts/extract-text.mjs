import { readFileSync } from 'fs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

async function extractText(pdfPath, maxPages = 3) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  console.error(`Pages: ${pdf.numPages}`);
  
  for (let i = 1; i <= Math.min(maxPages, pdf.numPages); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    console.log(`\n=== PAGE ${i} ===`);
    console.log(text.slice(0, 2000));
  }
}

const pdfPath = process.argv[2];
const maxPages = parseInt(process.argv[3] || '3');
extractText(pdfPath, maxPages).catch(e => console.error('Error:', e.message));
