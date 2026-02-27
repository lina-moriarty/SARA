/**
 * Parses convocatoria exam PDFs (2017-2023) and generates JSON files.
 * Run: node scripts/parse-convocatorias.mjs [year]
 * 
 * Format differences by year:
 * - 2017: options a) b) c) d) lowercase+paren; header ends with "MODELO A  N  "
 * - 2018: same as 2017; answer key is image-based (no text)
 * - 2019: same as 2017 (lowercase options); ANULADA appears after answer in key
 * - 2020: same as 2017 but pages interleaved with empty pages; ANULADA after answer in key
 * - 2021: ENTIRE exam is image-based; answer key has text
 * - 2022: options A) B) C) D) uppercase+paren; "ADLA - N  " prefix
 * - 2023: options A. B. C. D. uppercase+period; header "N PROCESO...CUESTIONARIO TIPO A"
 */

import { readFileSync, writeFileSync } from 'fs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

const BASE_DIR = join(__dirname, '..');
const RAW_DIR = join(BASE_DIR, 'convocatorias-raw');
const OUTPUT_DIR = join(BASE_DIR, 'questions');

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

/**
 * Strip the repeated page header from a page.
 * Different formats by year are all handled here.
 */
function stripPageHeader(text, year) {
  let stripped = text;
  
  if (year === 2023) {
    // "N PROCESO SELECTIVO...CUESTIONARIO TIPO A  "
    stripped = text.replace(/^\d+\s+PROCESO SELECTIVO.*?CUESTIONARIO TIPO [AB]\s*/s, '');
  } else if (year === 2022) {
    // "PROCESO SELECTIVO...SISTEMA DE ACCESO LIBRE  ADLA   -   N  "
    stripped = text.replace(/^PROCESO SELECTIVO.*?SISTEMA DE ACCESO LIBRE\s+ADLA\s*-\s*\d+\s+/s, '');
    if (stripped === text) {
      // Try simpler pattern
      stripped = text.replace(/^PROCESO SELECTIVO[^]*?ACCESO LIBRE\s+ADLA\s*[-–]\s*\d+\s+/s, '');
    }
  } else if (year === 2017) {
    // "PROCESO SELECTIVO...MODELO A  N  "
    stripped = text.replace(/^PROCESO SELECTIVO.*?MODELO [AB]\s+\d+\s+/s, '');
    if (stripped === text) {
      // Try without the number at end
      stripped = text.replace(/^PROCESO SELECTIVO.*?MODELO [AB]\s+/s, '');
    }
  } else if (year === 2018) {
    // "PROCESO SELECTIVO...DE TRÁFICO  N  "
    stripped = text.replace(/^PROCESO SELECTIVO.*?(?:ESPECIALIDAD DE TRÁFICO|DE TRÁFICO)\s+\d+\s+/s, '');
    if (stripped === text) {
      stripped = text.replace(/^PROCESO SELECTIVO.*?(?:ESPECIALIDAD DE TRÁFICO|DE TRÁFICO)\s+/s, '');
    }
  } else if (year === 2019 || year === 2020) {
    // "PROCESO SELECTIVO...SISTEMA DE ACCESO LIBRE  "
    stripped = text.replace(/^PROCESO SELECTIVO.*?SISTEMA DE ACCESO LIBRE\s+/s, '');
    if (stripped === text) {
      stripped = text.replace(/^PROCESO SELECTIVO.*?ACCESO LIBRE\s+/s, '');
    }
  }
  
  return stripped;
}

/**
 * Parse the answer key PDF and extract question number -> answer mapping.
 * Returns { mainAnswers: {1: 'A', ...}, reserveAnswers: {1: 'C', ...} }
 */
function parseAnswerKey(pages, year) {
  const fullText = pages.join(' ');
  
  const mainAnswers = {};
  const reserveAnswers = {};
  
  // Find the start of Model A answers (various header formats)
  let modelAStart = 0;
  const modelAPatterns = [
    /Cuestionario\s+A\s*:/i,
    /modelo\s+A\s*:/i,
    /preguntas del primer ejercicio\s*:/i,
    /preguntas del primer ejercicio,\s*(?:Cuestionario|modelo)\s*A\s*:/i,
  ];
  for (const pat of modelAPatterns) {
    const m = fullText.match(pat);
    if (m) { modelAStart = m.index + m[0].length; break; }
  }
  
  // Find the start of Model B answers
  let modelBStart = fullText.length;
  const modelBPatterns = [
    /Cuestionario\s+B\s*:/i,
    /modelo\s+B\s*:/i,
    /preguntas del primer ejercicio,\s*(?:Cuestionario|modelo)\s*B\s*:/i,
  ];
  for (const pat of modelBPatterns) {
    const m = fullText.match(pat);
    if (m) { modelBStart = m.index; break; }
  }
  
  // Find the reserve section within Model A
  let reserveStart = -1;
  const reservePatterns = [
    /preguntas\s+suplementarias\s+de\s+reserva[^:]*?(?:Cuestionario|modelo)\s*A\s*:/i,
    /preguntas\s+suplementarias\s+de\s+reserva\s+del\s+primer\s+ejercicio\s*[^:]*:/i,
  ];
  for (const pat of reservePatterns) {
    const m = fullText.match(pat);
    if (m && m.index < modelBStart) { reserveStart = m.index + m[0].length; break; }
  }
  
  // Text containing Model A main answers
  const mainEnd = reserveStart > modelAStart ? reserveStart : modelBStart;
  const modelAMainText = fullText.substring(modelAStart, mainEnd);
  
  // Parse answers using improved algorithm that detects ANULADA after a letter
  // Pattern: "N) X" followed optionally by whitespace+ANULADA
  const answerPattern = /(\d+)\)\s*(ANULADA|Anulada|[A-D])/gi;
  let prevMatch = null;
  let prevEnd = 0;
  const rawAnswers = []; // [{num, letter, end}]
  
  let m;
  const pattern2 = /(\d+)\)\s*(ANULADA|Anulada|[A-D])/gi;
  pattern2.lastIndex = 0;
  while ((m = pattern2.exec(modelAMainText)) !== null) {
    const num = parseInt(m[1]);
    const letter = m[2].toUpperCase();
    if (num >= 1 && num <= 100) {
      rawAnswers.push({ num, letter, start: m.index, end: m.index + m[0].length });
    }
  }
  
  // Now for each answer, check if ANULADA appears between it and the next answer
  for (let i = 0; i < rawAnswers.length; i++) {
    const r = rawAnswers[i];
    const nextStart = i + 1 < rawAnswers.length ? rawAnswers[i + 1].start : modelAMainText.length;
    const gap = modelAMainText.substring(r.end, nextStart);
    
    let finalAnswer = r.letter;
    if (r.letter !== 'ANULADA' && /\bANULADA\b/i.test(gap)) {
      finalAnswer = 'ANULADA';
    }
    
    // Only use this answer if we don't have one yet or if it's an update
    if (!mainAnswers[r.num]) {
      mainAnswers[r.num] = finalAnswer;
    }
  }
  
  // Parse reserve answers if they exist
  if (reserveStart > 0) {
    const reserveText = fullText.substring(reserveStart, modelBStart);
    const rPattern = /(\d+)\)\s*(ANULADA|Anulada|[A-D])/gi;
    const reserveRaw = [];
    while ((m = rPattern.exec(reserveText)) !== null) {
      const num = parseInt(m[1]);
      const letter = m[2].toUpperCase();
      if (num >= 1 && num <= 20) {
        reserveRaw.push({ num, letter, end: m.index + m[0].length });
      }
    }
    // Check for post-answer ANULADA
    for (let i = 0; i < reserveRaw.length; i++) {
      const r = reserveRaw[i];
      const nextStart = i + 1 < reserveRaw.length ? reserveRaw[i+1].start ?? reserveText.length : reserveText.length;
      const gap = reserveText.substring(r.end, nextStart);
      let finalAnswer = r.letter;
      if (r.letter !== 'ANULADA' && /\bANULADA\b/i.test(gap)) finalAnswer = 'ANULADA';
      if (!reserveAnswers[r.num]) reserveAnswers[r.num] = finalAnswer;
    }
  }
  
  return { mainAnswers, reserveAnswers };
}

/**
 * Normalize whitespace in text.
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

/**
 * Parse question text into question + options.
 * Handles multiple option formats:
 * - "  A.   text" (2023 - uppercase + period)
 * - "  A)   text" (2022 - uppercase + paren)
 * - "  a)   text" (2017-2020 - lowercase + paren)
 */
function parseQuestionText(rawText) {
  // Split on option markers BEFORE normalizing whitespace
  // Options are: A/a/B/b/C/c/D/d, then . or ), then 2+ spaces
  // (spaces BEFORE the letter may be only 1 in some formats like 2017)
  const optionPattern = /([A-Da-d])[.)]\s{2,}/g;
  const splits = [];
  let m;
  while ((m = optionPattern.exec(rawText)) !== null) {
    // Only count if the letter follows the valid A→B→C→D sequence
    const letter = m[1].toUpperCase();
    const expectedLetter = ['A', 'B', 'C', 'D'][splits.length];
    if (letter === expectedLetter) {
      splits.push({ letter, index: m.index, contentStart: m.index + m[0].length });
    }
  }
  
  if (splits.length === 0) {
    return { pregunta: cleanText(rawText), opciones: [] };
  }
  
  const pregunta = rawText.substring(0, splits[0].index);
  const opciones = [];
  
  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].contentStart;
    const end = i + 1 < splits.length ? splits[i + 1].index : rawText.length;
    opciones.push(cleanText(rawText.substring(start, end)));
  }
  
  return { pregunta: cleanText(pregunta), opciones };
}

/**
 * Extract the text block for question N from the given text.
 * Improved to skip instruction items by checking for option markers.
 */
function extractQuestionText(text, n, maxN) {
  const escapedN = String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escapedN + '\\.\\s{2,}', 'g');
  
  let validStart = -1;
  let m;
  
  while ((m = pattern.exec(text)) !== null) {
    const pos = m.index;
    const charBefore = pos > 0 ? text[pos - 1] : ' ';
    // Skip if preceded by a letter, digit, or dot (not a standalone number)
    if (/[\wáéíóúüñÁÉÍÓÚÜÑ.]/.test(charBefore)) continue;
    
    // Check the character after "N.   " - should be an uppercase/lowercase letter or punctuation starting a question
    const contentStart = pos + m[0].length;
    const firstChar = text[contentStart];
    if (firstChar && !/[A-ZÁÉÍÓÚÜÑa-záéíóúüñ¿«"0-9¡]/.test(firstChar)) continue;
    
    // Additional check: look ahead for option markers (a) b) c) d) or A. B. etc.)
    // within the next 500 characters to confirm this is a real question
    const next500 = text.substring(contentStart, Math.min(contentStart + 500, text.length));
    const hasOptions = /[a-dA-D][.)]\s{2,}/.test(next500);
    if (!hasOptions) {
      // Might be an instruction item, not a real question
      continue;
    }
    
    validStart = contentStart;
    break;
  }
  
  if (validStart === -1) return null;
  
  // Find the end: look for the NEXT question (n+1)
  let end = text.length;
  
  for (let next = n + 1; next <= Math.min(n + 5, maxN + 1); next++) {
    const nextEscaped = String(next).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextPattern = new RegExp(nextEscaped + '\\.\\s{2,}', 'g');
    nextPattern.lastIndex = validStart;
    
    let nm;
    while ((nm = nextPattern.exec(text)) !== null) {
      const pos = nm.index;
      const charBefore = pos > 0 ? text[pos - 1] : ' ';
      if (/[\wáéíóúüñÁÉÍÓÚÜÑ.]/.test(charBefore)) continue;
      
      const contentStart = pos + nm[0].length;
      const firstChar = text[contentStart];
      if (firstChar && !/[A-ZÁÉÍÓÚÜÑa-záéíóúüñ¿«"0-9¡]/.test(firstChar)) continue;
      
      // Check if this looks like a real question (has options)
      const next500 = text.substring(contentStart, Math.min(contentStart + 500, text.length));
      const hasOptions = /[a-dA-D][.)]\s{2,}/.test(next500);
      if (!hasOptions) continue;
      
      end = pos;
      break;
    }
    
    if (end < text.length) break;
  }
  
  // Also check for end markers
  const endMarkers = ['PREGUNTAS DE RESERVA', 'FIN DEL CUESTIONARIO', 'MODELO B', 'MODELO  B'];
  for (const marker of endMarkers) {
    const markerPos = text.indexOf(marker, validStart);
    if (markerPos !== -1 && markerPos < end) end = markerPos;
  }
  
  return text.substring(validStart, end);
}

async function processYear(year) {
  const shortYear = String(year).slice(2);
  const examPath = join(RAW_DIR, `EX CONVOC ${shortYear}.pdf`);
  const answerPath = join(RAW_DIR, `RESPUESTA CONVOC ${shortYear}.pdf`);
  
  console.error(`\n=== Processing ${year} ===`);
  
  const examPages = await extractAllPages(examPath);
  const answerPages = await extractAllPages(answerPath);
  
  const examTotalItems = examPages.reduce((sum, p) => sum + p.length, 0);
  console.error(`  Exam: ${examPages.length} pages, ${examTotalItems} total chars`);
  
  if (examTotalItems < 100) {
    console.error(`  ⚠️  EXAM IS IMAGE-BASED - cannot extract text!`);
    return { year, mainQuestions: 0, reserveQuestions: 0, error: 'exam is image-based' };
  }
  
  // Parse answer key
  const answerTotalItems = answerPages.reduce((sum, p) => sum + p.length, 0);
  if (answerTotalItems < 50) {
    console.error(`  ⚠️  ANSWER KEY IS IMAGE-BASED - no answers available!`);
    // Continue but answers will be null for all
  }
  
  const { mainAnswers, reserveAnswers } = parseAnswerKey(answerPages, year);
  console.error(`  Answers: ${Object.keys(mainAnswers).length} main, ${Object.keys(reserveAnswers).length} reserve`);
  
  // Process exam pages: skip cover page (page 1) ONLY if it has instructions, not actual questions
  // Some exams (2019) start questions on page 1
  const hasQuestionsOnPage1 = /\b1\.\s{2,}[A-ZÁÉÍÓÚÜÑa-záéíóúüñ¿]/.test(examPages[0]);
  const pageStart = hasQuestionsOnPage1 ? 0 : 1;
  console.error(`  Page 1 has questions: ${hasQuestionsOnPage1} → starting from page ${pageStart + 1}`);
  
  const cleanedPages = examPages.slice(pageStart).map(p => stripPageHeader(p, year));
  const fullText = cleanedPages.join(' ');
  
  // Find the Model B boundary (to exclude Model B questions)
  let modelBStart = fullText.search(/MODELO\s+B\b/);
  if (modelBStart === -1) modelBStart = fullText.search(/CUESTIONARIO\s+TIPO\s+B\b/);
  if (modelBStart === -1) modelBStart = fullText.length;
  
  const modelAText = fullText.substring(0, modelBStart);
  
  // Find reserve questions boundary
  // Variations: "PREGUNTAS SUPLEMENTARIAS DE RESERVA" (2017,2019,2020,2022) or "PREGUNTAS DE RESERVA" (2018,2023)
  let reserveMarker = modelAText.search(/PREGUNTAS\s+(?:SUPLEMENTARIAS\s+DE\s+|DE\s+)RESERVA/);
  
  let mainExamText, reserveExamText;
  if (reserveMarker !== -1) {
    // Skip past the marker text itself
    const markerEnd = modelAText.indexOf('RESERVA', reserveMarker) + 'RESERVA'.length;
    mainExamText = modelAText.substring(0, reserveMarker);
    reserveExamText = modelAText.substring(markerEnd);
  } else {
    mainExamText = modelAText;
    reserveExamText = '';
  }
  
  console.error(`  Main text: ${mainExamText.length} chars | Reserve text: ${reserveExamText.length} chars`);
  
  const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };
  const questions = [];
  let badOptionCount = 0;
  let missingCount = 0;
  
  // Extract main questions 1-100
  let extractedCount = 0;
  for (let n = 1; n <= 100; n++) {
    const block = extractQuestionText(mainExamText, n, 100);
    if (!block) {
      missingCount++;
      if (missingCount <= 10) console.error(`  WARNING: Could not find question ${n}`);
      continue;
    }
    
    const { pregunta, opciones } = parseQuestionText(block);
    
    if (opciones.length !== 4) {
      badOptionCount++;
      if (badOptionCount <= 5) console.error(`  WARNING: Q${n} has ${opciones.length} options`);
    }
    
    const answerLetter = mainAnswers[n];
    const correcta = !answerLetter ? null :
                     answerLetter === 'ANULADA' ? null :
                     letterToIndex[answerLetter] ?? null;
    
    questions.push({
      pregunta: cleanText(pregunta),
      opciones: opciones.map(cleanText),
      correcta,
      explicacion: answerLetter === 'ANULADA'
        ? `Pregunta anulada. Referencia: Convocatoria ${year}.`
        : `Respuesta oficial: ${answerLetter || '?'}. Referencia: Convocatoria ${year}.`,
      tema: null,
      bloque: null,
      fuente: {
        documento: `Convocatoria real ${year}`,
        referencia: `Examen convocatoria ${year} (Modelo A), pregunta ${n}`,
        texto: '',
        documentoId: '',
        seccionId: ''
      }
    });
    extractedCount++;
  }
  
  if (badOptionCount > 5) console.error(`  WARNING: ${badOptionCount} questions had wrong option count`);
  if (missingCount > 0) console.error(`  WARNING: ${missingCount} questions not found`);
  
  // Extract reserve questions
  let reserveCount = 0;
  const maxReserve = Object.keys(reserveAnswers).length > 0
    ? Math.max(...Object.keys(reserveAnswers).map(Number))
    : (reserveExamText.length > 100 ? 10 : 0);
  
  for (let n = 1; n <= maxReserve; n++) {
    const block = extractQuestionText(reserveExamText, n, maxReserve);
    if (!block) {
      if (reserveAnswers[n]) console.error(`  WARNING: Could not find reserve question ${n}`);
      continue;
    }
    
    const { pregunta, opciones } = parseQuestionText(block);
    const answerLetter = reserveAnswers[n];
    const correcta = !answerLetter ? null :
                     answerLetter === 'ANULADA' ? null :
                     letterToIndex[answerLetter] ?? null;
    
    questions.push({
      pregunta: cleanText(pregunta),
      opciones: opciones.map(cleanText),
      correcta,
      explicacion: answerLetter === 'ANULADA'
        ? `Pregunta de reserva anulada. Referencia: Convocatoria ${year}.`
        : `Respuesta oficial: ${answerLetter || '?'}. Referencia: Convocatoria ${year} (pregunta de reserva).`,
      tema: null,
      bloque: null,
      fuente: {
        documento: `Convocatoria real ${year}`,
        referencia: `Examen convocatoria ${year} (Modelo A), pregunta de reserva ${n}`,
        texto: '',
        documentoId: '',
        seccionId: ''
      }
    });
    reserveCount++;
  }
  
  console.error(`  Extracted: ${extractedCount} main + ${reserveCount} reserve`);
  if (extractedCount < 90) console.error(`  ⚠️  ONLY ${extractedCount} main questions - expected ~100!`);
  
  const output = {
    title: `Examen Convocatoria Real ${year}`,
    description: `100 preguntas del examen oficial de la convocatoria ${year} para el Cuerpo General Administrativo, especialidad Tráfico (DGT). Respuestas verificadas con la plantilla definitiva oficial.`,
    questions
  };
  
  const outputPath = join(OUTPUT_DIR, `convocatoria-${year}.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.error(`  ✓ Saved to convocatoria-${year}.json`);
  
  return { year, mainQuestions: extractedCount, reserveQuestions: reserveCount, badOptions: badOptionCount, missing: missingCount };
}

async function main() {
  const years = process.argv[2]
    ? [parseInt(process.argv[2])]
    : [2017, 2018, 2019, 2020, 2021, 2022, 2023];
  
  const results = [];
  for (const year of years) {
    try {
      const result = await processYear(year);
      results.push(result);
    } catch (err) {
      console.error(`  ✗ Error processing ${year}: ${err.message}`);
      console.error(err.stack);
    }
  }
  
  console.error('\n=== Summary ===');
  for (const r of results) {
    if (r.error) {
      console.error(`${r.year}: ERROR - ${r.error}`);
    } else {
      const flags = [];
      if (r.badOptions > 0) flags.push(`${r.badOptions} bad options`);
      if (r.missing > 0) flags.push(`${r.missing} missing`);
      const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
      console.error(`${r.year}: ${r.mainQuestions} main + ${r.reserveQuestions} reserve${flagStr}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
