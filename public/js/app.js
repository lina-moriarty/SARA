// === SARA — Quiz App Logic ===

const THEMES = [
  { id: 'dark', name: 'Oscuro', bg: '#0f172a', fg: '#60a5fa', text: '#e2e8f0' },
  { id: 'midnight', name: 'Medianoche', bg: '#09090b', fg: '#a78bfa', text: '#fafafa' },
  { id: 'forest', name: 'Bosque', bg: '#0c1a0e', fg: '#86efac', text: '#dcfce7' },
  { id: 'dgt', name: 'DGT', bg: '#111827', fg: '#f59e0b', text: '#f9fafb' },
  { id: 'mallorca', name: 'Mallorca', bg: '#fef9ef', fg: '#2563eb', text: '#1c1917' },
  { id: 'light', name: 'Claro', bg: '#f8fafc', fg: '#2563eb', text: '#0f172a' },
];

const App = {
  // State
  quizzes: [],
  currentQuiz: null,
  currentQuestionIndex: 0,
  mode: 'learning',
  answers: [],
  pendingQuizIndex: null,
  sources: {},
  timer: null,
  startTime: null,
  elapsedSeconds: 0,
  theme: localStorage.getItem('sara-theme') || 'dark',
  bgImage: localStorage.getItem('sara-bg-image') === 'true',

  // DOM elements
  el: {
    startScreen: document.getElementById('start-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultsScreen: document.getElementById('results-screen'),
    quizList: document.getElementById('quiz-list'),
    modeModal: document.getElementById('mode-modal'),
    modeModalTitle: document.getElementById('mode-modal-title'),
    questionCounter: document.getElementById('question-counter'),
    scoreDisplay: document.getElementById('score-display'),
    timerEl: document.getElementById('timer'),
    progressFill: document.getElementById('progress-fill'),
    temaBadge: document.getElementById('tema-badge'),
    bloqueBadge: document.getElementById('bloque-badge'),
    questionText: document.getElementById('question-text'),
    options: document.getElementById('options'),
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackResult: document.getElementById('feedback-result'),
    feedbackExplanation: document.getElementById('feedback-explanation'),
    nextBtn: document.getElementById('next-btn'),
    sourcePanel: document.getElementById('source-panel'),
    sourceRef: document.getElementById('source-ref'),
    sourceContent: document.getElementById('source-content'),
    closeSource: document.getElementById('close-source'),
    totalCorrect: document.getElementById('total-correct'),
    totalIncorrect: document.getElementById('total-incorrect'),
    totalUnanswered: document.getElementById('total-unanswered'),
    finalScore: document.getElementById('final-score'),
    passFail: document.getElementById('pass-fail'),
    timeTaken: document.getElementById('time-taken'),
    reviewList: document.getElementById('review-list'),
    restartBtn: document.getElementById('restart-btn'),
    settingsModal: document.getElementById('settings-modal'),
    themeGrid: document.getElementById('theme-grid'),
  },

  // === INIT ===
  async init() {
    this.applyTheme(this.theme);
    this.applyBackground(this.bgImage);
    this.renderThemeGrid();
    this.bindEvents();
    await this.loadQuizList();

    // Show onboarding on first visit
    const hasVisited = localStorage.getItem('sara-onboarded');
    if (!hasVisited) {
      this.showOnboarding();
    }
  },

  showOnboarding() {
    const onboarding = document.getElementById('onboarding');
    const grid = document.getElementById('onboarding-theme-grid');
    const startBtn = document.getElementById('onboarding-start');

    // Hide start screen, show onboarding
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    onboarding.classList.add('active');

    // Render theme swatches in onboarding grid
    grid.innerHTML = THEMES.map(t => `
      <div class="theme-swatch ${t.id === this.theme ? 'active' : ''}" 
           data-theme="${t.id}"
           style="background: ${t.bg}; color: ${t.fg}; border-color: ${t.fg};"
           onclick="App.applyTheme('${t.id}'); document.querySelectorAll('#onboarding-theme-grid .theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === '${t.id}'));">
        <span class="theme-swatch-name" style="color: ${t.text}">${t.name}</span>
        <span class="theme-swatch-preview" style="color: ${t.fg}">Aa</span>
      </div>
    `).join('');

    startBtn.addEventListener('click', () => {
      localStorage.setItem('sara-onboarded', '1');
      onboarding.classList.remove('active');
      this.showScreen('start');
    });
  },

  bindEvents() {
    this.el.nextBtn.addEventListener('click', () => this.nextQuestion());
    this.el.closeSource.addEventListener('click', () => this.el.sourcePanel.classList.add('hidden'));
    this.el.restartBtn.addEventListener('click', () => this.backToMenu());

    // Close settings modal on backdrop click
    this.el.settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeSettings());
  },

  // === THEMES ===
  applyTheme(themeId) {
    this.theme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('sara-theme', themeId);
    // Update active swatch
    document.querySelectorAll('.theme-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.theme === themeId);
    });
  },

  renderThemeGrid() {
    this.el.themeGrid.innerHTML = THEMES.map(t => `
      <div class="theme-swatch ${t.id === this.theme ? 'active' : ''}" 
           data-theme="${t.id}"
           style="background: ${t.bg}; color: ${t.fg};"
           onclick="App.applyTheme('${t.id}')">
        <span class="theme-swatch-name" style="color: ${t.text}">${t.name}</span>
        <span class="theme-swatch-preview" style="color: ${t.fg}">Aa</span>
      </div>
    `).join('');
  },

  toggleBackground(enabled) {
    this.bgImage = enabled;
    localStorage.setItem('sara-bg-image', enabled);
    this.applyBackground(enabled);
  },

  applyBackground(enabled) {
    document.documentElement.classList.toggle('bg-image', enabled);
    const checkbox = document.getElementById('bg-toggle');
    if (checkbox) checkbox.checked = enabled;
  },

  openSettings() {
    this.el.settingsModal.classList.remove('hidden');
  },

  closeSettings() {
    this.el.settingsModal.classList.add('hidden');
  },

  // === NAVIGATION ===
  backToMenu() {
    if (this.timer) clearInterval(this.timer);
    this.showScreen('start');
  },

  // === QUIZ LIST ===
  async loadQuizList() {
    try {
      const res = await fetch('/api/quizzes.json');
      this.quizzes = await res.json();
      this.renderQuizList();
    } catch (e) {
      this.el.quizList.innerHTML = '<p class="loading">Error cargando tests. Refresca la página.</p>';
    }
  },

  renderQuizList() {
    if (this.quizzes.length === 0) {
      this.el.quizList.innerHTML = '<p class="loading">No hay tests disponibles todavía.</p>';
      return;
    }

    this.el.quizList.innerHTML = this.quizzes.map((q, i) => `
      <div class="quiz-item" data-index="${i}">
        <div class="quiz-item-info">
          <div class="quiz-item-title">${q.title}</div>
          <div class="quiz-item-meta">${q.questionCount} preguntas · ${q.description || ''}</div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.quiz-item').forEach(item => {
      item.addEventListener('click', () => {
        this.pendingQuizIndex = parseInt(item.dataset.index);
        this.openModeModal();
      });
    });
  },

  // === MODE MODAL ===
  openModeModal() {
    this.el.modeModal.classList.remove('hidden');
  },

  closeModeModal() {
    this.el.modeModal.classList.add('hidden');
  },

  selectModeAndStart(mode) {
    this.mode = mode;
    this.closeModeModal();
    this.startQuiz();
  },

  // === START QUIZ ===
  async startQuiz() {
    if (this.pendingQuizIndex == null) return;

    const quizMeta = this.quizzes[this.pendingQuizIndex];
    
    try {
      const res = await fetch(`/api/quizzes/${quizMeta.id}.json`);
      this.currentQuiz = await res.json();
    } catch (e) {
      alert('Error cargando el test.');
      return;
    }

    this.currentQuestionIndex = 0;
    this.answers = initAnswers(this.currentQuiz.questions.length);

    this.startTime = Date.now();
    this.elapsedSeconds = 0;
    this.timer = setInterval(() => this.updateTimer(), 1000);

    if (this.mode === 'learning') {
      this.el.scoreDisplay.classList.remove('hidden');
    } else {
      this.el.scoreDisplay.classList.add('hidden');
    }

    this.showScreen('quiz');
    this.renderQuestion();
  },

  // === RENDER QUESTION ===
  renderQuestion() {
    const q = this.currentQuiz.questions[this.currentQuestionIndex];
    const total = this.currentQuiz.questions.length;
    const num = this.currentQuestionIndex + 1;

    this.el.questionCounter.textContent = `${num} / ${total}`;
    this.el.progressFill.style.width = `${(num / total) * 100}%`;
    this.el.temaBadge.textContent = `Tema ${q.tema}`;
    this.el.bloqueBadge.textContent = `Bloque ${q.bloque}: ${getBloqueName(q.bloque)}`;

    this.el.questionText.textContent = q.pregunta;

    const letters = ['A', 'B', 'C', 'D'];
    this.el.options.innerHTML = q.opciones.map((opt, i) => `
      <div class="option" data-index="${i}">
        <span class="option-letter">${letters[i]}</span>
        <span class="option-text">${opt}</span>
      </div>
    `).join('');

    document.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => this.selectOption(parseInt(opt.dataset.index)));
    });

    this.el.feedbackPanel.classList.add('hidden');
    this.el.sourcePanel.classList.add('hidden');
    this.updateScoreDisplay();
  },

  // === SELECT OPTION ===
  selectOption(index) {
    const q = this.currentQuiz.questions[this.currentQuestionIndex];
    const isCorrect = index === q.correcta;

    this.answers[this.currentQuestionIndex] = {
      selected: index,
      correct: isCorrect
    };

    if (this.mode === 'learning') {
      this.showLearningFeedback(index, q);
    } else {
      document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
      document.querySelectorAll('.option')[index].classList.add('selected');
      setTimeout(() => this.nextQuestion(), 300);
    }
  },

  // === LEARNING FEEDBACK ===
  showLearningFeedback(selectedIndex, question) {
    const isCorrect = selectedIndex === question.correcta;

    document.querySelectorAll('.option').forEach((opt, i) => {
      opt.classList.add('disabled');
      if (i === question.correcta) opt.classList.add('correct');
      if (i === selectedIndex && !isCorrect) opt.classList.add('incorrect');
    });

    this.el.feedbackResult.className = `feedback-result ${isCorrect ? 'correct' : 'incorrect'}`;
    this.el.feedbackResult.textContent = isCorrect ? 'Correcto' : 'Incorrecto';

    let explanationHTML = `<p>${question.explicacion}</p>`;
    if (question.fuente) {
      const lawName = question.fuente.documento || 'Ver fuente';
      explanationHTML += `<a class="feedback-source-link" onclick="App.showSource(${this.currentQuestionIndex})">${lawName} — ${question.fuente.referencia || 'Ver referencia'}</a>`;
    }
    this.el.feedbackExplanation.innerHTML = explanationHTML;

    this.el.feedbackPanel.classList.remove('hidden');
    this.updateScoreDisplay();
  },

  // === SHOW SOURCE ===
  async showSource(questionIndex) {
    const q = this.currentQuiz.questions[questionIndex];
    if (!q.fuente) return;

    // Load source data first (needed for URL and content)
    let source = null;
    if (q.fuente.documentoId) {
      try {
        if (!this.sources[q.fuente.documentoId]) {
          const res = await fetch(`/api/sources/${q.fuente.documentoId}`);
          if (!res.ok) throw new Error('Not found');
          this.sources[q.fuente.documentoId] = await res.json();
        }
        source = this.sources[q.fuente.documentoId];
      } catch (e) {
        source = null;
      }
    }

    // Build source ref with clickable law name
    const lawName = q.fuente.documento || '';
    const articleRef = q.fuente.referencia || '';
    const lawUrl = q.fuente.url || (source && source.url) || '';
    this.el.sourceRef.innerHTML = lawUrl
      ? `<a class="source-ref-law" href="${lawUrl}" target="_blank" rel="noopener">${lawName}</a><span class="source-ref-article"> — ${articleRef}</span>`
      : `<span class="source-ref-law">${lawName}</span><span class="source-ref-article"> — ${articleRef}</span>`;

    // Make law name open full text in new tab if URL available
    const lawLink = this.el.sourceRef.querySelector('.source-ref-law');
    if (q.fuente.url) {
      lawLink.addEventListener('click', () => window.open(q.fuente.url, '_blank'));
    } else if (q.fuente.documentoId) {
      lawLink.addEventListener('click', () => {
        window.open(`/sources/text/${q.fuente.documentoId}.md`, '_blank');
      });
    }

    // Render source content
    if (!source) {
      this.el.sourceContent.innerHTML = `<p><strong>${q.fuente.referencia || ''}</strong></p><p>${q.fuente.texto || 'Material de referencia no disponible.'}</p>`;
    } else {
      const section = source.sections.find(s => s.id === q.fuente.seccionId);

      if (section) {
        // Parse article number from referencia (e.g. "Artículo 1.2" → "1", "Artículo 17" → "17")
        const artMatch = (q.fuente.referencia || '').match(/Art[íi]culo\s+(\d+)/i);
        const artNum = artMatch ? artMatch[1] : null;

        const paragraphs = section.content.split('\n\n');
        const html = paragraphs.map(p => {
          const isTarget = artNum && new RegExp(`^Artículo\\s+${artNum}\\b`).test(p);
          const formatted = p.replace(/\n/g, '<br>');
          return isTarget
            ? `<div class="source-article highlight">${formatted}</div>`
            : `<div class="source-article">${formatted}</div>`;
        }).join('');

        this.el.sourceContent.innerHTML = html;

        // Scroll to highlighted article
        const highlighted = this.el.sourceContent.querySelector('.highlight');
        if (highlighted) {
          requestAnimationFrame(() => highlighted.scrollIntoView({ block: 'start', behavior: 'smooth' }));
        }
      } else {
        this.el.sourceContent.innerHTML = '<p>Sección no encontrada.</p>';
      }
    }

    this.el.sourcePanel.classList.remove('hidden');
  },

  // === NEXT QUESTION ===
  nextQuestion() {
    if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
      this.currentQuestionIndex++;
      this.renderQuestion();
      window.scrollTo(0, 0);
    } else {
      this.finishQuiz();
    }
  },

  // === FINISH QUIZ ===
  finishQuiz() {
    clearInterval(this.timer);

    const { correct, incorrect, unanswered, score } = calculateScore(this.answers);
    const maxScore = this.currentQuiz.questions.length;
    const percentage = calculatePercentage(score, maxScore);

    this.el.totalCorrect.textContent = correct;
    this.el.totalIncorrect.textContent = incorrect;
    this.el.totalUnanswered.textContent = unanswered;
    this.el.finalScore.textContent = `${percentage}%`;

    this.el.passFail.style.display = 'none';
    this.el.timeTaken.textContent = formatTimeTaken(this.elapsedSeconds);

    this.renderReview();
    this.showScreen('results');
  },

  // === RENDER REVIEW ===
  renderReview() {
    const letters = ['A', 'B', 'C', 'D'];
    
    this.el.reviewList.innerHTML = this.currentQuiz.questions.map((q, i) => {
      const answer = this.answers[i];
      const { status, icon: statusIcon } = getReviewStatus(answer);

      const optionsHTML = q.opciones.map((opt, j) => {
        const cls = getReviewOptionClass(j, q.correcta, answer);
        return `<div class="review-option ${cls}">${letters[j]}) ${opt}</div>`;
      }).join('');

      const sourceHTML = q.fuente ? `
        <div class="review-source">
          <a class="feedback-source-link" onclick="App.showSource(${i})">${q.fuente.documento} — ${q.fuente.referencia}</a>
          <div>${q.fuente.texto || ''}</div>
        </div>
      ` : '';

      return `
        <div class="review-item" data-index="${i}">
          <div class="review-item-header" onclick="App.toggleReview(${i})">
            <span class="review-status ${status}">${statusIcon}</span>
            <span class="review-question">${i + 1}. ${q.pregunta}</span>
            <span class="review-toggle">\u25BC</span>
          </div>
          <div class="review-detail">
            <div class="review-options">${optionsHTML}</div>
            <div class="review-explanation">${q.explicacion}</div>
            ${sourceHTML}
          </div>
        </div>
      `;
    }).join('');
  },

  toggleReview(index) {
    const item = document.querySelector(`.review-item[data-index="${index}"]`);
    item.classList.toggle('expanded');
  },

  // === HELPERS ===
  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    this.el[name + 'Screen'].classList.add('active');
  },

  updateTimer() {
    this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    this.el.timerEl.textContent = formatTimer(this.elapsedSeconds);
  },

  updateScoreDisplay() {
    const { correct, incorrect } = calculateScore(this.answers);
    this.el.scoreDisplay.textContent = `${correct} bien · ${incorrect} mal`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
