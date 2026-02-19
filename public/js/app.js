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
  sources: {},
  timer: null,
  startTime: null,
  elapsedSeconds: 0,
  theme: localStorage.getItem('sara-theme') || 'dark',

  // DOM elements
  el: {
    startScreen: document.getElementById('start-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultsScreen: document.getElementById('results-screen'),
    quizList: document.getElementById('quiz-list'),
    startBtn: document.getElementById('start-btn'),
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
    document.querySelectorAll('.mode-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
        this.mode = opt.dataset.mode;
      });
    });

    this.el.startBtn.addEventListener('click', () => this.startQuiz());
    this.el.nextBtn.addEventListener('click', () => this.nextQuestion());
    this.el.closeSource.addEventListener('click', () => this.el.sourcePanel.classList.add('hidden'));
    this.el.restartBtn.addEventListener('click', () => this.backToMenu());

    // Close modal on backdrop click
    document.querySelector('.modal-backdrop').addEventListener('click', () => this.closeSettings());
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
      <label class="quiz-item" data-index="${i}">
        <input type="radio" name="quiz" value="${i}">
        <div class="quiz-item-info">
          <div class="quiz-item-title">${q.title}</div>
          <div class="quiz-item-meta">${q.questionCount} preguntas · ${q.description || ''}</div>
        </div>
      </label>
    `).join('');

    document.querySelectorAll('.quiz-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.quiz-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        item.querySelector('input').checked = true;
        this.el.startBtn.disabled = false;
      });
    });
  },

  // === START QUIZ ===
  async startQuiz() {
    const selectedRadio = document.querySelector('input[name="quiz"]:checked');
    if (!selectedRadio) return;

    const quizMeta = this.quizzes[parseInt(selectedRadio.value)];
    
    try {
      const res = await fetch(`/api/quizzes/${quizMeta.id}.json`);
      this.currentQuiz = await res.json();
    } catch (e) {
      alert('Error cargando el test.');
      return;
    }

    this.currentQuestionIndex = 0;
    this.answers = new Array(this.currentQuiz.questions.length).fill(null).map(() => ({
      selected: null,
      correct: false
    }));

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

    const bloqueNames = {
      1: 'Organización del Estado',
      2: 'Derecho Administrativo',
      3: 'Normativa de Tráfico',
      4: 'Seguridad Vial'
    };
    this.el.bloqueBadge.textContent = `Bloque ${q.bloque}: ${bloqueNames[q.bloque] || ''}`;

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

    // Build source ref with clickable law name
    const lawName = q.fuente.documento || '';
    const articleRef = q.fuente.referencia || '';
    this.el.sourceRef.innerHTML = `
      <span class="source-ref-law" title="Abrir ley completa">${lawName}</span>
      <span class="source-ref-article"> — ${articleRef}</span>
    `;

    // Make law name open full text in new tab if URL available
    const lawLink = this.el.sourceRef.querySelector('.source-ref-law');
    if (q.fuente.url) {
      lawLink.addEventListener('click', () => window.open(q.fuente.url, '_blank'));
    } else if (q.fuente.documentoId) {
      lawLink.addEventListener('click', () => {
        window.open(`/sources/text/${q.fuente.documentoId}.md`, '_blank');
      });
    }

    try {
      if (!this.sources[q.fuente.documentoId]) {
        const res = await fetch(`/api/sources/${q.fuente.documentoId}`);
        this.sources[q.fuente.documentoId] = await res.json();
      }

      const source = this.sources[q.fuente.documentoId];
      const section = source.sections.find(s => s.id === q.fuente.seccionId);

      if (section) {
        let content = section.content;
        if (q.fuente.parrafo) {
          const paragraphs = content.split('\n\n');
          content = paragraphs.map((p, i) => {
            if (i === q.fuente.parrafo) return `<span class="highlight">${p}</span>`;
            return p;
          }).join('\n\n');
        }
        this.el.sourceContent.innerHTML = content.replace(/\n\n/g, '<br><br>');
      } else {
        this.el.sourceContent.innerHTML = '<p>Sección no encontrada.</p>';
      }
    } catch (e) {
      this.el.sourceContent.innerHTML = `<p><strong>${q.fuente.referencia}</strong></p><p>${q.fuente.texto || 'Material de referencia no disponible.'}</p>`;
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

    const correct = this.answers.filter(a => a.correct).length;
    const incorrect = this.answers.filter(a => a.selected !== null && !a.correct).length;
    const unanswered = this.answers.filter(a => a.selected === null).length;
    
    const score = Math.max(0, correct - (incorrect * 0.33));
    const maxScore = this.currentQuiz.questions.length;
    const percentage = ((score / maxScore) * 100).toFixed(1);

    this.el.totalCorrect.textContent = correct;
    this.el.totalIncorrect.textContent = incorrect;
    this.el.totalUnanswered.textContent = unanswered;
    this.el.finalScore.textContent = `${percentage}%`;

    this.el.passFail.style.display = 'none';

    const mins = Math.floor(this.elapsedSeconds / 60);
    const secs = this.elapsedSeconds % 60;
    this.el.timeTaken.textContent = `Tiempo: ${mins}m ${secs}s`;

    this.renderReview();
    this.showScreen('results');
  },

  // === RENDER REVIEW ===
  renderReview() {
    const letters = ['A', 'B', 'C', 'D'];
    
    this.el.reviewList.innerHTML = this.currentQuiz.questions.map((q, i) => {
      const answer = this.answers[i];
      let status = 'unanswered';
      let statusIcon = '—';
      if (answer.selected !== null) {
        status = answer.correct ? 'correct' : 'incorrect';
        statusIcon = answer.correct ? '\u2713' : '\u2717';
      }

      const optionsHTML = q.opciones.map((opt, j) => {
        let cls = '';
        if (j === q.correcta && answer.selected === j) cls = 'user-correct';
        else if (j === answer.selected && !answer.correct) cls = 'user-incorrect';
        else if (j === q.correcta) cls = 'was-correct';
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
    const mins = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(this.elapsedSeconds % 60).padStart(2, '0');
    this.el.timerEl.textContent = `${mins}:${secs}`;
  },

  updateScoreDisplay() {
    const correct = this.answers.filter(a => a.correct).length;
    const incorrect = this.answers.filter(a => a.selected !== null && !a.correct).length;
    this.el.scoreDisplay.textContent = `${correct} bien · ${incorrect} mal`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
