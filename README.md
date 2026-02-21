# SARA — Sistema de Autoevaluación y Repaso para oposiciones de examinAdor de tráfico

Quiz app for preparing the **Examinador de Tráfico (DGT)** Spanish civil service exam.

## Features

- **100-question quiz sets** matching the real exam format
- **4 options per question**, 1 correct — wrong answers penalise (like the real exam)
- **Two modes:**
  - **Learning mode:** Instant feedback after each question with explanation + source legislation panel
  - **Exam mode:** Complete the quiz first, then review all answers with explanations and source references
- **Source legislation panel:** Each question links to the exact section in the official legislation (fetched from structured JSON, sourced from BOE consolidated texts)
- **Score calculation** with penalty system matching the real oposición (correct +1, wrong −0.33, unanswered 0)
- **6 visual themes** (dark, midnight, forest, DGT, mallorca, light) with onboarding theme picker
- **Zero dependencies** — vanilla JS, no build step, no framework

## Running

```bash
node server.js
# → http://localhost:3000
```

No `npm install` needed. Uses only Node.js built-ins.

## Current Content

### Quizzes
- **Bloque 1, Set 1** — 25 questions (Temas 1-8)
- **Demo Bloque 1** — 10 questions (sample)

### Source Legislation (6 files)
- Constitución Española de 1978
- RDL 5/2015 (EBEP)
- Ley 39/2015 (LPAC)
- Ley 50/1997 (del Gobierno)
- LO 6/1985 (del Poder Judicial)
- LO 1/2004 (Violencia de Género)

## Temario (35 temas, 4 bloques)

### Bloque 1: Organización del Estado (Temas 1-8)
Constitution, Government, EU institutions, public employment law

### Bloque 2: Derecho Administrativo General (Temas 9-12)
Administrative law, procedures, appeals

### Bloque 3: Normativa de Tráfico (Temas 13-21)
DGT organisation, driving licences, examiner rules, driving schools

### Bloque 4: Seguridad Vial (Temas 22-35)
Road rules, speed, signalling, vehicles, accident prevention

## Key Source Legislation
- Constitución Española 1978
- Real Decreto Legislativo 6/2015 (Ley de Tráfico)
- Real Decreto 818/2009 (Reglamento General de Conductores)
- Real Decreto Legislativo 5/2015 (Estatuto Básico del Empleado Público)
- Ley 39/2015 (Procedimiento Administrativo Común)
- Ley 40/2015 (Régimen Jurídico del Sector Público)
- Ley 50/1997 (del Gobierno)
- LO 6/1985 (del Poder Judicial)
- LO 1/2004 (Violencia de Género)
- Estrategia de Seguridad Vial 2030

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **Backend:** Node.js HTTP server (zero dependencies)
- **Data:** Static JSON question banks + structured legislation JSON
- **No database** — all content is static

## License
Private — for personal study use only.
