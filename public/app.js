const STORAGE_KEY = 'leme-focus-simple-v1';

const DEFAULT_STATE = {
  theme: 'light',
  mode: 'pomodoro',
  settings: {
    pomodoro: 25,
    short: 5,
    long: 15
  },
  report: {
    date: todayKey(),
    pomodoros: 0,
    focusMinutes: 0
  },
  tasks: [],
  cycle: 1
};

let state = loadState();
const ORIGINAL_TITLE = document.title;
let titleFlashIntervalId = null;
let alarmIntervalId = null;
let alarmAudioContext = null;
let isAlarmActive = false;
let isRunning = false;
let remainingSeconds = minutesToSeconds(state.settings[state.mode]);
let timerEndAt = null;
let intervalId = null;

const elements = {
  timeDisplay: document.getElementById('timeDisplay'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  modeMessage: document.getElementById('modeMessage'),
  cycleCount: document.getElementById('cycleCount'),
  tabs: [...document.querySelectorAll('.tab')],
  settingsToggle: document.getElementById('settingsToggle'),
  settingsPanel: document.getElementById('settingsPanel'),
  settingsClose: document.getElementById('settingsClose'),
  settingsForm: document.getElementById('settingsForm'),
  pomodoroInput: document.getElementById('pomodoroInput'),
  shortInput: document.getElementById('shortInput'),
  longInput: document.getElementById('longInput'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  taskList: document.getElementById('taskList'),
  clearDoneBtn: document.getElementById('clearDoneBtn'),
  reportBtn: document.getElementById('reportBtn'),
  reportModal: document.getElementById('reportModal'),
  reportClose: document.getElementById('reportClose'),
  reportPomodoros: document.getElementById('reportPomodoros'),
  reportMinutes: document.getElementById('reportMinutes'),
  reportOpenTasks: document.getElementById('reportOpenTasks'),
  resetReportBtn: document.getElementById('resetReportBtn'),
  toast: document.getElementById('toast'),
  doneModal: document.getElementById('doneModal'),
  doneTitle: document.getElementById('doneTitle'),
  doneText: document.getElementById('doneText'),
  doneStartNextBtn: document.getElementById('doneStartNextBtn')
};

const messages = {
  pomodoro: 'Hora de focar.',
  short: 'Hora de respirar um pouco.',
  long: 'Pausa longa merecida.'
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);

    const merged = {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
      report: { ...DEFAULT_STATE.report, ...(saved.report || {}) },
      tasks: Array.isArray(saved.tasks) ? saved.tasks : []
    };

    if (merged.report.date !== todayKey()) {
      merged.report = { date: todayKey(), pomodoros: 0, focusMinutes: 0 };
    }

    return merged;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function minutesToSeconds(minutes) {
  return Math.max(1, Number(minutes) || 1) * 60;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  elements.themeIcon.textContent = state.theme === 'dark' ? '☀' : '☾';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'dark' ? '#06111f' : '#173d56');
}

function setMode(mode) {
  stopTimer(false);
  state.mode = mode;
  remainingSeconds = minutesToSeconds(state.settings[mode]);
  saveState();
  render();
}

function startTimer() {
  prepareAlarmAudio();

  if (isAlarmActive) {
    stopCompletionAlert();
  }

  if (isRunning) {
    pauseTimer();
    return;
  }

  isRunning = true;
  timerEndAt = Date.now() + remainingSeconds * 1000;
  elements.startBtn.textContent = 'PAUSAR';
  elements.resetBtn.classList.remove('hidden');

  intervalId = window.setInterval(tick, 250);
  tick();
}

function pauseTimer() {
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;
  elements.startBtn.textContent = 'CONTINUAR';
}

function stopTimer(resetRemaining = true) {
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;
  timerEndAt = null;
  elements.startBtn.textContent = 'COMEÇAR';
  elements.resetBtn.classList.add('hidden');

  if (resetRemaining) {
    remainingSeconds = minutesToSeconds(state.settings[state.mode]);
  }
}

function tick() {
  if (!isRunning || !timerEndAt) return;

  remainingSeconds = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
  elements.timeDisplay.textContent = formatTime(remainingSeconds);

  if (remainingSeconds <= 0) {
    completeTimer();
  }
}

function completeTimer() {
  const completedMode = state.mode;
  stopTimer(false);
  startAlarmLoop();
  vibrateDevice();

  if (completedMode === 'pomodoro') {
    state.report.pomodoros += 1;
    state.report.focusMinutes += Number(state.settings.pomodoro) || 25;
    state.cycle += 1;
    state.mode = 'short';
    showToast('Pomodoro concluído. Boa!');
  } else {
    state.mode = 'pomodoro';
    showToast('Pausa concluída. Vamos voltar?');
  }

  remainingSeconds = minutesToSeconds(state.settings[state.mode]);
  saveState();
  render();
  showCompletionAlert(completedMode);
}

function prepareAlarmAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!alarmAudioContext) {
      alarmAudioContext = new AudioContext();
    }

    if (alarmAudioContext.state === 'suspended') {
      alarmAudioContext.resume();
    }
  } catch {
    // Alguns navegadores podem bloquear áudio antes de uma interação.
  }
}

function playAlarmPattern() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!alarmAudioContext) {
      alarmAudioContext = new AudioContext();
    }

    if (alarmAudioContext.state === 'suspended') {
      alarmAudioContext.resume();
    }

    const context = alarmAudioContext;
    const pattern = [0, 0.28, 0.56];

    pattern.forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime + delay;
      const endAt = startAt + 0.2;

      oscillator.type = 'sine';
      oscillator.frequency.value = index === 1 ? 940 : 760;
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, endAt);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt);
    });
  } catch {
    // Som não suportado. O timer continua funcionando normalmente.
  }
}

function startAlarmLoop() {
  stopAlarmLoop(false);
  isAlarmActive = true;
  playAlarmPattern();
  alarmIntervalId = window.setInterval(playAlarmPattern, 1300);
}

function stopAlarmLoop(closeContext = false) {
  if (alarmIntervalId) {
    window.clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  isAlarmActive = false;

  if (closeContext && alarmAudioContext) {
    alarmAudioContext.close().catch(() => {});
    alarmAudioContext = null;
  }
}

function vibrateDevice() {
  if ('vibrate' in navigator) {
    navigator.vibrate([250, 140, 250, 140, 350]);
  }
}

function showCompletionAlert(completedMode) {
  const isFocus = completedMode === 'pomodoro';
  const title = isFocus ? 'Pomodoro concluído!' : 'Pausa concluída!';
  const body = isFocus
    ? 'Seu ciclo de foco terminou. O alerta continuará tocando até você iniciar a pausa.'
    : 'Sua pausa terminou. O alerta continuará tocando até você voltar ao foco.';

  elements.doneTitle.textContent = title;
  elements.doneText.textContent = body;

  startTitleFlash(title);

  if (typeof elements.doneModal.showModal === 'function') {
    if (elements.doneModal.open) elements.doneModal.close();
    elements.doneModal.showModal();
  }
}

function stopCompletionAlert() {
  stopAlarmLoop();
  stopTitleFlash();
  if (elements.doneModal.open) elements.doneModal.close();
}

function startNextCycle() {
  stopCompletionAlert();
  startTimer();
}

function startTitleFlash(message) {
  stopTitleFlash(false);
  let showMessage = true;
  document.title = `⏰ ${message}`;
  titleFlashIntervalId = window.setInterval(() => {
    document.title = showMessage ? ORIGINAL_TITLE : `⏰ ${message}`;
    showMessage = !showMessage;
  }, 900);
}

function stopTitleFlash(restoreTitle = true) {
  if (titleFlashIntervalId) {
    window.clearInterval(titleFlashIntervalId);
    titleFlashIntervalId = null;
  }
  if (restoreTitle) document.title = ORIGINAL_TITLE;
}

function updateSettingsFromForm(event) {
  event.preventDefault();

  const nextSettings = {
    pomodoro: clampNumber(elements.pomodoroInput.value, 1, 180, 25),
    short: clampNumber(elements.shortInput.value, 1, 60, 5),
    long: clampNumber(elements.longInput.value, 1, 120, 15)
  };

  state.settings = nextSettings;
  stopTimer(true);
  saveState();
  render();
  showToast('Tempos atualizados.');
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function addTask(event) {
  event.preventDefault();
  const title = elements.taskInput.value.trim();
  if (!title) return;

  state.tasks.unshift({
    id: makeId(),
    title,
    done: false,
    createdAt: new Date().toISOString()
  });

  elements.taskInput.value = '';
  saveState();
  renderTasks();
}

function toggleTask(id) {
  state.tasks = state.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
  saveState();
  renderTasks();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(task => task.id !== id);
  saveState();
  renderTasks();
}

function clearDoneTasks() {
  state.tasks = state.tasks.filter(task => !task.done);
  saveState();
  renderTasks();
}

function renderTasks() {
  if (!state.tasks.length) {
    elements.taskList.innerHTML = '<p class="task-empty">Nenhuma tarefa ainda. Adicione algo simples para focar.</p>';
    updateReport();
    return;
  }

  elements.taskList.innerHTML = state.tasks.map(task => `
    <div class="task-item ${task.done ? 'done' : ''}">
      <button class="task-check" type="button" data-toggle-task="${task.id}" aria-label="Marcar tarefa"></button>
      <span class="task-title">${escapeHtml(task.title)}</span>
      <button class="delete-task" type="button" data-delete-task="${task.id}" aria-label="Excluir tarefa">×</button>
    </div>
  `).join('');

  updateReport();
}

function updateReport() {
  const openTasks = state.tasks.filter(task => !task.done).length;
  elements.reportPomodoros.textContent = state.report.pomodoros;
  elements.reportMinutes.textContent = formatMinutes(state.report.focusMinutes);
  elements.reportOpenTasks.textContent = openTasks;
}

function render() {
  applyTheme();

  elements.timeDisplay.textContent = formatTime(remainingSeconds);
  elements.modeMessage.textContent = messages[state.mode];
  elements.cycleCount.textContent = `#${state.cycle}`;

  elements.tabs.forEach(tab => {
    const isActive = tab.dataset.mode === state.mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  elements.pomodoroInput.value = state.settings.pomodoro;
  elements.shortInput.value = state.settings.short;
  elements.longInput.value = state.settings.long;

  updateReport();
  renderTasks();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2200);
}

function openReport() {
  updateReport();
  if (typeof elements.reportModal.showModal === 'function') {
    elements.reportModal.showModal();
  }
}

function closeReport() {
  if (elements.reportModal.open) elements.reportModal.close();
}

function bindEvents() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  elements.startBtn.addEventListener('click', startTimer);
  elements.resetBtn.addEventListener('click', () => {
    stopTimer(true);
    render();
  });

  elements.settingsToggle.addEventListener('click', () => {
    const isClosed = elements.settingsPanel.classList.toggle('closed');
    elements.settingsToggle.classList.toggle('active', !isClosed);
    elements.settingsToggle.setAttribute('aria-expanded', String(!isClosed));
  });

  elements.settingsClose.addEventListener('click', () => {
    elements.settingsPanel.classList.add('closed');
    elements.settingsToggle.classList.remove('active');
    elements.settingsToggle.setAttribute('aria-expanded', 'false');
  });

  elements.settingsForm.addEventListener('submit', updateSettingsFromForm);

  elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
  });

  elements.taskForm.addEventListener('submit', addTask);
  elements.clearDoneBtn.addEventListener('click', clearDoneTasks);

  elements.taskList.addEventListener('click', event => {
    const toggleId = event.target.dataset.toggleTask;
    const deleteId = event.target.dataset.deleteTask;
    if (toggleId) toggleTask(toggleId);
    if (deleteId) deleteTask(deleteId);
  });

  elements.reportBtn.addEventListener('click', openReport);
  elements.reportClose.addEventListener('click', closeReport);
  elements.reportModal.addEventListener('click', event => {
    if (event.target === elements.reportModal) closeReport();
  });

  elements.resetReportBtn.addEventListener('click', () => {
    state.report = { date: todayKey(), pomodoros: 0, focusMinutes: 0 };
    saveState();
    updateReport();
    showToast('Relatório zerado.');
  });

  elements.doneStartNextBtn.addEventListener('click', startNextCycle);
  elements.doneModal.addEventListener('cancel', event => {
    event.preventDefault();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && titleFlashIntervalId) {
      document.title = ORIGINAL_TITLE;
    }
  });
}


bindEvents();
render();
