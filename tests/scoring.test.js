const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateScore,
  calculatePercentage,
  formatTimer,
  formatTimeTaken,
  initAnswers,
  getReviewStatus,
  getReviewOptionClass,
  getBloqueName
} = require('../public/js/quiz-logic.js');

// === calculateScore ===
describe('calculateScore', () => {
  it('all correct answers', () => {
    const answers = Array.from({ length: 10 }, () => ({ selected: 0, correct: true }));
    const result = calculateScore(answers);
    assert.equal(result.correct, 10);
    assert.equal(result.incorrect, 0);
    assert.equal(result.unanswered, 0);
    assert.equal(result.score, 10);
  });

  it('all incorrect answers — score clamped to 0', () => {
    const answers = Array.from({ length: 10 }, () => ({ selected: 1, correct: false }));
    const result = calculateScore(answers);
    assert.equal(result.correct, 0);
    assert.equal(result.incorrect, 10);
    assert.equal(result.unanswered, 0);
    assert.equal(result.score, 0); // Max(0, 0 - 10*0.33) = 0
  });

  it('all unanswered', () => {
    const answers = Array.from({ length: 10 }, () => ({ selected: null, correct: false }));
    const result = calculateScore(answers);
    assert.equal(result.correct, 0);
    assert.equal(result.incorrect, 0);
    assert.equal(result.unanswered, 10);
    assert.equal(result.score, 0);
  });

  it('mixed: 7 correct, 2 wrong, 1 unanswered', () => {
    const answers = [
      ...Array.from({ length: 7 }, () => ({ selected: 0, correct: true })),
      ...Array.from({ length: 2 }, () => ({ selected: 1, correct: false })),
      { selected: null, correct: false }
    ];
    const result = calculateScore(answers);
    assert.equal(result.correct, 7);
    assert.equal(result.incorrect, 2);
    assert.equal(result.unanswered, 1);
    assert.ok(Math.abs(result.score - 6.34) < 0.001);
  });

  it('score would go negative without clamping', () => {
    const answers = Array.from({ length: 5 }, () => ({ selected: 2, correct: false }));
    const result = calculateScore(answers);
    assert.equal(result.score, 0);
  });

  it('single correct answer', () => {
    const result = calculateScore([{ selected: 0, correct: true }]);
    assert.equal(result.correct, 1);
    assert.equal(result.score, 1);
  });

  it('single incorrect answer', () => {
    const result = calculateScore([{ selected: 1, correct: false }]);
    assert.equal(result.correct, 0);
    assert.equal(result.incorrect, 1);
    assert.equal(result.score, 0);
  });

  it('single unanswered', () => {
    const result = calculateScore([{ selected: null, correct: false }]);
    assert.equal(result.unanswered, 1);
    assert.equal(result.score, 0);
  });

  it('realistic 100-question exam: 60 correct, 30 wrong, 10 unanswered', () => {
    const answers = [
      ...Array.from({ length: 60 }, () => ({ selected: 0, correct: true })),
      ...Array.from({ length: 30 }, () => ({ selected: 1, correct: false })),
      ...Array.from({ length: 10 }, () => ({ selected: null, correct: false }))
    ];
    const result = calculateScore(answers);
    assert.equal(result.correct, 60);
    assert.equal(result.incorrect, 30);
    assert.equal(result.unanswered, 10);
    assert.ok(Math.abs(result.score - 50.1) < 0.001);
  });

  it('empty answers array', () => {
    const result = calculateScore([]);
    assert.equal(result.correct, 0);
    assert.equal(result.incorrect, 0);
    assert.equal(result.unanswered, 0);
    assert.equal(result.score, 0);
  });
});

// === calculatePercentage ===
describe('calculatePercentage', () => {
  it('perfect score', () => {
    assert.equal(calculatePercentage(100, 100), '100.0');
  });

  it('zero score', () => {
    assert.equal(calculatePercentage(0, 100), '0.0');
  });

  it('fractional score', () => {
    assert.equal(calculatePercentage(50.1, 100), '50.1');
  });

  it('single question correct', () => {
    assert.equal(calculatePercentage(1, 1), '100.0');
  });

  it('penalty result', () => {
    assert.equal(calculatePercentage(6.34, 10), '63.4');
  });
});

// === formatTimer ===
describe('formatTimer', () => {
  it('0 seconds', () => {
    assert.equal(formatTimer(0), '00:00');
  });

  it('59 seconds', () => {
    assert.equal(formatTimer(59), '00:59');
  });

  it('60 seconds = 1 minute', () => {
    assert.equal(formatTimer(60), '01:00');
  });

  it('59 minutes 59 seconds', () => {
    assert.equal(formatTimer(3599), '59:59');
  });

  it('60 minutes exactly', () => {
    assert.equal(formatTimer(3600), '60:00');
  });

  it('1 minute 30 seconds', () => {
    assert.equal(formatTimer(90), '01:30');
  });
});

// === formatTimeTaken ===
describe('formatTimeTaken', () => {
  it('0 seconds', () => {
    assert.equal(formatTimeTaken(0), 'Tiempo: 0m 0s');
  });

  it('65 seconds', () => {
    assert.equal(formatTimeTaken(65), 'Tiempo: 1m 5s');
  });

  it('3600 seconds', () => {
    assert.equal(formatTimeTaken(3600), 'Tiempo: 60m 0s');
  });

  it('5 seconds', () => {
    assert.equal(formatTimeTaken(5), 'Tiempo: 0m 5s');
  });
});

// === initAnswers ===
describe('initAnswers', () => {
  it('creates array of correct length', () => {
    const answers = initAnswers(100);
    assert.equal(answers.length, 100);
  });

  it('each element has default structure', () => {
    const answers = initAnswers(3);
    for (const a of answers) {
      assert.deepEqual(a, { selected: null, correct: false });
    }
  });

  it('elements are independent objects', () => {
    const answers = initAnswers(3);
    answers[0].selected = 2;
    assert.equal(answers[0].selected, 2);
    assert.equal(answers[1].selected, null);
  });

  it('zero-length quiz', () => {
    const answers = initAnswers(0);
    assert.equal(answers.length, 0);
  });
});

// === getReviewStatus ===
describe('getReviewStatus', () => {
  it('unanswered question', () => {
    const result = getReviewStatus({ selected: null, correct: false });
    assert.equal(result.status, 'unanswered');
    assert.equal(result.icon, '—');
  });

  it('correct answer', () => {
    const result = getReviewStatus({ selected: 0, correct: true });
    assert.equal(result.status, 'correct');
    assert.equal(result.icon, '✓');
  });

  it('incorrect answer', () => {
    const result = getReviewStatus({ selected: 1, correct: false });
    assert.equal(result.status, 'incorrect');
    assert.equal(result.icon, '✗');
  });
});

// === getReviewOptionClass ===
describe('getReviewOptionClass', () => {
  it('user selected the correct option', () => {
    const answer = { selected: 2, correct: true };
    assert.equal(getReviewOptionClass(2, 2, answer), 'user-correct');
  });

  it('user selected wrong option', () => {
    const answer = { selected: 1, correct: false };
    assert.equal(getReviewOptionClass(1, 2, answer), 'user-incorrect');
  });

  it('correct option that user did not select', () => {
    const answer = { selected: 1, correct: false };
    assert.equal(getReviewOptionClass(2, 2, answer), 'was-correct');
  });

  it('option that is neither selected nor correct', () => {
    const answer = { selected: 1, correct: false };
    assert.equal(getReviewOptionClass(3, 2, answer), '');
  });

  it('unanswered — correct option shows was-correct', () => {
    const answer = { selected: null, correct: false };
    assert.equal(getReviewOptionClass(2, 2, answer), 'was-correct');
  });

  it('unanswered — non-correct option shows empty', () => {
    const answer = { selected: null, correct: false };
    assert.equal(getReviewOptionClass(0, 2, answer), '');
  });
});

// === getBloqueName ===
describe('getBloqueName', () => {
  it('bloque 1', () => {
    assert.equal(getBloqueName(1), 'Organización del Estado');
  });

  it('bloque 2', () => {
    assert.equal(getBloqueName(2), 'Derecho Administrativo');
  });

  it('bloque 3', () => {
    assert.equal(getBloqueName(3), 'Normativa de Tráfico');
  });

  it('bloque 4', () => {
    assert.equal(getBloqueName(4), 'Seguridad Vial');
  });

  it('unknown bloque returns empty string', () => {
    assert.equal(getBloqueName(99), '');
  });
});
