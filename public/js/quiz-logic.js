// === SARA — Pure Business Logic (shared between browser and Node.js tests) ===

function calculateScore(answers) {
  const correct = answers.filter(a => a.correct).length;
  const incorrect = answers.filter(a => a.selected !== null && !a.correct).length;
  const unanswered = answers.filter(a => a.selected === null).length;
  const score = Math.max(0, correct - (incorrect * 0.33));
  return { correct, incorrect, unanswered, score };
}

function calculatePercentage(score, totalQuestions) {
  return ((score / totalQuestions) * 100).toFixed(1);
}

function formatTimer(elapsedSeconds) {
  const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const secs = String(Math.floor(elapsedSeconds) % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatTimeTaken(elapsedSeconds) {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  return `Tiempo: ${mins}m ${secs}s`;
}

function initAnswers(questionCount) {
  return new Array(questionCount).fill(null).map(() => ({
    selected: null,
    correct: false
  }));
}

function getReviewStatus(answer) {
  if (answer.selected === null) return { status: 'unanswered', icon: '—' };
  return answer.correct
    ? { status: 'correct', icon: '✓' }
    : { status: 'incorrect', icon: '✗' };
}

function getReviewOptionClass(optionIndex, correctIndex, answer) {
  if (optionIndex === correctIndex && answer.selected === optionIndex) return 'user-correct';
  if (optionIndex === answer.selected && !answer.correct) return 'user-incorrect';
  if (optionIndex === correctIndex) return 'was-correct';
  return '';
}

function getBloqueName(bloqueNumber) {
  const names = {
    1: 'Organización del Estado',
    2: 'Derecho Administrativo',
    3: 'Normativa de Tráfico',
    4: 'Seguridad Vial'
  };
  return names[bloqueNumber] || '';
}

// Export for Node.js (tests), no-op in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateScore,
    calculatePercentage,
    formatTimer,
    formatTimeTaken,
    initAnswers,
    getReviewStatus,
    getReviewOptionClass,
    getBloqueName
  };
}
