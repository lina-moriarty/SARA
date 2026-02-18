# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SARA is a quiz application for Spanish civil service exam preparation (Examinador de Tráfico - DGT). It simulates the official 100-question exam format with penalty-based scoring (correct +1, wrong -0.33, unanswered 0). Two modes: Learning (instant feedback with explanations and source references) and Exam (results shown at end).

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
- `GET /api/sources/{id}` — returns source material JSON from `/sources/text/`

Also serves static files from `/public/`. Has directory traversal protection on file-serving routes.

### Frontend (public/)

Single-page app with three screens (start → quiz → results), managed by a global `App` object in `app.js`. Screen transitions work by toggling visibility of `<section>` elements in `index.html`. CSS uses custom properties for theming with responsive breakpoints at 900px and 500px.

### Data (questions/ and sources/)

Quiz JSON files in `/questions/` follow this structure per question: `tema`, `bloque`, `pregunta`, `opciones` (array of 4), `correcta` (0-indexed), `explicacion`, and `fuente` (source reference with `documentoId`, `referencia`, `texto`).

Source materials in `/sources/` include original PDFs (`parte-general/`, `parte-especifica/`, `examenes/`) and markdown text extractions in `/sources/text/`. The script `scripts/extract-pdfs.sh` converts PDFs to text using `pdftotext`.

## Language

All UI text, questions, explanations, and source materials are in Spanish.
