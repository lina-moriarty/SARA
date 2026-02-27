import { readFileSync } from 'fs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

async function extractAllPages(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  return pages;
}

function stripPageHeader(text) {
  return text.replace(/^\d+\s+PROCESO SELECTIVO.*?CUESTIONARIO TIPO [AB]\s*/s, '');
}

const pages = await extractAllPages('convocatorias-raw/EX CONVOC 23.pdf');
const cleaned = pages.slice(1).map(stripPageHeader);
const full = cleaned.join(' ');

// Show first 1000 chars after stripping header from page 2
console.log('=== After header strip, first 1000 chars ===');
console.log(JSON.stringify(cleaned[0].substring(0, 1000)));

console.log('\n=== Looking for "A.   " pattern ===');
const regex = /[A-D]\.\s{2,}/g;
let m;
let count = 0;
while ((m = regex.exec(full)) !== null && count < 5) {
  console.log(`At ${m.index}: "${m[0]}" (context: "${full.substring(m.index-10, m.index+30)}")`);
  count++;
}

// What's the actual char after "A."?
const a1 = full.indexOf('A.');
console.log('\n=== First "A." occurrence ===');
console.log(JSON.stringify(full.substring(a1, a1 + 30)));
// Show char codes
const s = full.substring(a1, a1 + 10);
for (let i = 0; i < s.length; i++) {
  console.log(`  [${i}] '${s[i]}' = ${s.charCodeAt(i)}`);
}
