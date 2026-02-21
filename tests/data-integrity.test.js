const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'questions');
const sourcesDir = path.join(__dirname, '..', 'sources');

// Load all question files
const questionFiles = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));
const quizzes = questionFiles.map(f => ({
  filename: f,
  id: path.basename(f, '.json'),
  data: JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8'))
}));

// Load all source files
const sourceFiles = fs.readdirSync(sourcesDir).filter(f => f.endsWith('.json'));
const sources = sourceFiles.map(f => ({
  filename: f,
  id: path.basename(f, '.json'),
  data: JSON.parse(fs.readFileSync(path.join(sourcesDir, f), 'utf8'))
}));

// === Question file structure ===
describe('Question files — structure', () => {
  for (const quiz of quizzes) {
    describe(quiz.filename, () => {
      it('is valid JSON with title and questions array', () => {
        assert.ok(typeof quiz.data.title === 'string' && quiz.data.title.length > 0,
          'must have non-empty title');
        assert.ok(Array.isArray(quiz.data.questions), 'must have questions array');
        assert.ok(quiz.data.questions.length > 0, 'questions array must not be empty');
      });

      it('has a description', () => {
        assert.ok(typeof quiz.data.description === 'string', 'must have description string');
      });
    });
  }
});

describe('Question files — question validation', () => {
  for (const quiz of quizzes) {
    describe(quiz.filename, () => {
      quiz.data.questions.forEach((q, i) => {
        describe(`question ${i + 1}`, () => {
          it('has pregunta (non-empty string)', () => {
            assert.ok(typeof q.pregunta === 'string' && q.pregunta.length > 0,
              `question ${i + 1}: pregunta must be a non-empty string`);
          });

          it('has opciones (array of exactly 4 non-empty strings)', () => {
            assert.ok(Array.isArray(q.opciones), 'opciones must be an array');
            assert.equal(q.opciones.length, 4, 'opciones must have exactly 4 items');
            q.opciones.forEach((opt, j) => {
              assert.ok(typeof opt === 'string' && opt.length > 0,
                `option ${j} must be a non-empty string`);
            });
          });

          it('has correcta (integer 0-3)', () => {
            assert.ok(Number.isInteger(q.correcta), 'correcta must be an integer');
            assert.ok(q.correcta >= 0 && q.correcta <= 3,
              `correcta must be 0-3, got ${q.correcta}`);
          });

          it('has explicacion (non-empty string)', () => {
            assert.ok(typeof q.explicacion === 'string' && q.explicacion.length > 0,
              'explicacion must be a non-empty string');
          });

          it('has valid tema (positive integer)', () => {
            assert.ok(Number.isInteger(q.tema) && q.tema > 0,
              `tema must be a positive integer, got ${q.tema}`);
          });

          it('has valid bloque (1-4)', () => {
            assert.ok(Number.isInteger(q.bloque) && q.bloque >= 1 && q.bloque <= 4,
              `bloque must be 1-4, got ${q.bloque}`);
          });

          it('has fuente object', () => {
            assert.ok(q.fuente && typeof q.fuente === 'object', 'must have fuente object');
          });
        });
      });
    });
  }
});

describe('Question files — no duplicate questions within each file', () => {
  for (const quiz of quizzes) {
    it(`${quiz.filename} has no duplicate pregunta text`, () => {
      const texts = quiz.data.questions.map(q => q.pregunta);
      const unique = new Set(texts);
      assert.equal(texts.length, unique.size,
        `found ${texts.length - unique.size} duplicate question(s)`);
    });
  }
});

// === Source file structure ===
describe('Source files — structure', () => {
  for (const source of sources) {
    describe(source.filename, () => {
      it('has title (non-empty string)', () => {
        assert.ok(typeof source.data.title === 'string' && source.data.title.length > 0,
          'must have non-empty title');
      });

      it('has sections array', () => {
        assert.ok(Array.isArray(source.data.sections), 'must have sections array');
        assert.ok(source.data.sections.length > 0, 'sections must not be empty');
      });

      it('each section has id, title, and content', () => {
        source.data.sections.forEach((s, i) => {
          assert.ok(typeof s.id === 'string' && s.id.length > 0,
            `section ${i}: must have non-empty id`);
          assert.ok(typeof s.title === 'string' && s.title.length > 0,
            `section ${i}: must have non-empty title`);
          assert.ok(typeof s.content === 'string' && s.content.length > 0,
            `section ${i}: must have non-empty content`);
        });
      });

      it('section IDs are unique', () => {
        const ids = source.data.sections.map(s => s.id);
        const unique = new Set(ids);
        assert.equal(ids.length, unique.size,
          `found ${ids.length - unique.size} duplicate section ID(s)`);
      });
    });
  }
});

// === Cross-reference validation ===
describe('Cross-references — questions to sources', () => {
  // Build a map of all source IDs and their section IDs
  const sourceMap = {};
  for (const source of sources) {
    sourceMap[source.id] = new Set(source.data.sections.map(s => s.id));
  }

  for (const quiz of quizzes) {
    describe(quiz.filename, () => {
      quiz.data.questions.forEach((q, i) => {
        if (!q.fuente || !q.fuente.documentoId || q.fuente.documentoId === '') return;

        it(`question ${i + 1}: documentoId "${q.fuente.documentoId}" references an existing source file`, () => {
          assert.ok(sourceMap[q.fuente.documentoId],
            `source file sources/${q.fuente.documentoId}.json not found`);
        });

        if (q.fuente.seccionId && q.fuente.seccionId !== '') {
          it(`question ${i + 1}: seccionId "${q.fuente.seccionId}" exists in source "${q.fuente.documentoId}"`, () => {
            assert.ok(sourceMap[q.fuente.documentoId],
              `source file not found for documentoId "${q.fuente.documentoId}"`);
            assert.ok(sourceMap[q.fuente.documentoId].has(q.fuente.seccionId),
              `section "${q.fuente.seccionId}" not found in source "${q.fuente.documentoId}"`);
          });
        }
      });
    });
  }
});

// === Summary statistics (informational) ===
describe('Data summary', () => {
  it('reports total question and source counts', () => {
    const totalQuestions = quizzes.reduce((sum, q) => sum + q.data.questions.length, 0);
    console.log(`  Total quiz files: ${quizzes.length}`);
    console.log(`  Total questions: ${totalQuestions}`);
    console.log(`  Total source files: ${sources.length}`);

    // Check which source files are referenced
    const referencedSources = new Set();
    for (const quiz of quizzes) {
      for (const q of quiz.data.questions) {
        if (q.fuente && q.fuente.documentoId && q.fuente.documentoId !== '') {
          referencedSources.add(q.fuente.documentoId);
        }
      }
    }
    const unreferenced = sourceFiles
      .map(f => path.basename(f, '.json'))
      .filter(id => !referencedSources.has(id));

    if (unreferenced.length > 0) {
      console.log(`  Unreferenced source files: ${unreferenced.join(', ')}`);
    }

    assert.ok(true);
  });
});
