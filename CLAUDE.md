# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SARA is a quiz application for Spanish civil service exam preparation (Examinador de Tráfico - DGT). It simulates the official 100-question exam format with penalty-based scoring (correct +1, wrong -0.33, unanswered 0). Two modes: Learning (instant feedback with explanations and source references) and Exam (results shown at end with full review).

## Running the Application

```bash
node server.js
```

Server starts on port 3000 (or `PORT` env variable). No dependencies to install — the project uses only Node.js built-in modules (`http`, `fs`, `path`).

## Architecture

**Zero-dependency stack:** vanilla JS frontend, plain Node.js HTTP server, static JSON data files. No build step, no package manager, no framework.

### Backend (server.js)

Single-file HTTP server with three API routes:
- `GET /api/quizzes` — lists available quiz files from `/questions/`
- `GET /api/quizzes/{id}` — returns a specific quiz JSON
- `GET /api/sources/{id}` — returns source legislation JSON from `/sources/{id}.json`

Also serves static files from `/public/`. Has directory traversal protection on file-serving routes.

### Frontend (public/)

Single-page app with three screens (start → quiz → results), managed by a global `App` object in `app.js`. Screen transitions work by toggling visibility of `<section>` elements in `index.html`. CSS uses custom properties for theming (6 themes: dark, midnight, forest, DGT, mallorca, light) with responsive breakpoints at 900px and 500px.

**Quiz modes:**
- **Learning:** Instant feedback after each question with explanation + clickable source reference that opens a side panel with the relevant legislation text.
- **Exam:** Answer all questions first, then review results. Each reviewed question has a clickable source link that opens the same legislation side panel.

**Results screen:** Shows percentage score, correct/incorrect/unanswered counts, time taken, and expandable review of each question with colour-coded answer options.

### Data

#### Questions (questions/)

Quiz JSON files follow this structure:
```json
{
  "title": "Quiz title",
  "description": "Description",
  "questions": [
    {
      "tema": 1,
      "bloque": 1,
      "pregunta": "Question text",
      "opciones": ["A", "B", "C", "D"],
      "correcta": 1,
      "explicacion": "Explanation text",
      "fuente": {
        "documentoId": "constitucion-1978",
        "documento": "Constitución Española de 1978",
        "referencia": "Título I, Arts. 10-55",
        "seccionId": "titulo-i",
        "texto": "Inline source excerpt"
      }
    }
  ]
}
```

**Important:** Every question must have `fuente.documentoId` and `fuente.seccionId` for the source panel to work. The `documentoId` maps to a file in `sources/`, and `seccionId` maps to a section within that file.

#### Source Legislation (sources/)

**JSON source files** (`sources/{documentoId}.json`) — structured legislation text used by the `/api/sources/` endpoint:
```json
{
  "title": "Full law title",
  "sections": [
    {
      "id": "titulo-i",
      "title": "Section title",
      "content": "Full text of this section..."
    }
  ]
}
```

Current source files:
- `constitucion-1978.json` — Constitución Española de 1978 (7 sections)
- `ebep.json` — RDL 5/2015, Estatuto Básico del Empleado Público
- `ley-39-2015.json` — Ley 39/2015, Procedimiento Administrativo Común
- `ley-50-1997.json` — Ley 50/1997, del Gobierno
- `lopj.json` — LO 6/1985, del Poder Judicial
- `tema-7.json` — LO 1/2004, Violencia de Género

**PDF originals** in `sources/parte-general/`, `sources/parte-especifica/`, `sources/examenes/` — raw reference material. The script `scripts/extract-pdfs.sh` converts PDFs to text using `pdftotext`.

## Adding New Questions

1. Create a new JSON file in `questions/` following the structure above.
2. Ensure every question has `fuente.documentoId` and `fuente.seccionId`.
3. If referencing a new law, create a corresponding `sources/{documentoId}.json` with the relevant sections.
4. The quiz will automatically appear in the quiz selector on the start screen.

## Language

All UI text, questions, explanations, and source materials are in Spanish.
