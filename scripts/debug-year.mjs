import { readFileSync } from 'fs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

const yr = process.argv[2] || '17';

async function run() {
  const data = new Uint8Array(readFileSync('convocatorias-raw/EX CONVOC '+yr+'.pdf'));
  const pdf = await getDocument({data, useSystemFonts:true}).promise;
  console.log('Pages:', pdf.numPages);
  
  const page2 = await pdf.getPage(2);
  const tc2 = await page2.getTextContent();
  const text2 = tc2.items.map(it=>it.str).join(' ');
  console.log('\n=== Page 2 raw (first 2000 chars) ===');
  console.log(JSON.stringify(text2.substring(0,2000)));
  
  // Show char codes around first option
  const aPos = text2.indexOf('a)');
  if (aPos >= 0) {
    console.log('\n=== Around first a) ===');
    const s = text2.substring(Math.max(0,aPos-5), aPos+30);
    for (let i = 0; i < s.length; i++) {
      process.stdout.write('['+s.charCodeAt(i)+'='+s[i]+']');
    }
    console.log();
  }
  
  // Also check page 2 with items separated to show spacing
  console.log('\n=== Page 2 items (first 20) ===');
  tc2.items.slice(0, 20).forEach((item, i) => {
    console.log(`  [${i}] str="${item.str}" width=${item.width?.toFixed(1)}`);
  });
}
run();
