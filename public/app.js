const STORAGE_KEY = 'leme-focus-v1';

const DEFAULT_STATE = {
  settings: {
    focus: 25,
    short: 5,
    long: 15,
    roundsBeforeLong: 4,
    autoBreak: false,
    autoFocus: false
  },
  tasks: [],
  sessions: [],
  activeTaskId: null,
  mode: 'focus',
  roundCounter: 0
};

let state = loadState();
let isRunning = false;
let remainingSeconds = getModeSeconds(state.mode);
let totalSeconds = getModeSeconds(state.mode);
let timerEnd = null;
let ticker = null;
let currentStartedAt = null;

const els = {
  timeDisplay: document.getElementById('timeDisplay'),
  modeLabel: document.getElementById('modeLabel'),
  timerStatus: document.getElementById('timerStatus'),
  timerRing: document.getElementById('timerRing'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  completeBtn: document.getElementById('completeBtn'),
  activeTaskPill: document.getElementById('activeTaskPill'),
  taskForm: document.getElementById('taskForm'),
  clientInput: document.getElementById('clientInput'),
  titleInput: document.getElementById('titleInput'),
  estimateInput: document.getElementById('estimateInput'),
  taskList: document.getElementById('taskList'),
  searchInput: document.getElementById('searchInput'),
  filterSelect: document.getElementById('filterSelect'),
  todayMinutes: document.getElementById('todayMinutes'),
  todayCycles: document.getElementById('todayCycles'),
  weekMinutes: document.getElementById('weekMinutes'),
  weekCycles: document.getElementById('weekCycles'),
  openTasks: document.getElementById('openTasks'),
  topClient: document.getElementById('topClient'),
  clientBars: document.getElementById('clientBars'),
  sessionTable: document.getElementById('sessionTable'),
  settingsForm: document.getElementById('settingsForm'),
  focusMinutes: document.getElementById('focusMinutes'),
  shortMinutes: document.getElementById('shortMinutes'),
  longMinutes: document.getElementById('longMinutes'),
  roundsBeforeLong: document.getElementById('roundsBeforeLong'),
  autoBreak: document.getElementById('autoBreak'),
  autoFocus: document.getElementById('autoFocus'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  notifyBtn: document.getElementById('notifyBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  resetDataBtn: document.getElementById('resetDataBtn')
};

const labels = {
  focus: 'Ciclo de foco',
  short: 'Pausa curta',
  long: 'Pausa longa'
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
      tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
      sessions: Array.isArray(saved.sessions) ? saved.sessions : []
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getModeSeconds(mode) {
  return Math.max(1, Number(state.settings[mode] || 25)) * 60;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
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

function startTimer() {
  if (isRunning) return pauseTimer();
  if (state.mode === 'focus' && !state.activeTaskId && state.tasks.some(task => !task.done)) {
    toast('Selecione uma demanda para registrar melhor o foco.');
  }
  isRunning = true;
  currentStartedAt = currentStartedAt || new Date().toISOString();
  timerEnd = Date.now() + remainingSeconds * 1000;
  els.startBtn.textContent = 'Pausar';
  els.timerStatus.textContent = state.mode === 'focus' ? 'Em foco' : 'Pausa em andamento';
  tick();
  ticker = setInterval(tick, 250);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(ticker);
  ticker = null;
  remainingSeconds = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  timerEnd = null;
  els.startBtn.textContent = 'Continuar';
  els.timerStatus.textContent = 'Pausado';
  updateTimerDisplay();
}

function resetTimer() {
  isRunning = false;
  clearInterval(ticker);
  ticker = null;
  currentStartedAt = null;
  totalSeconds = getModeSeconds(state.mode);
  remainingSeconds = totalSeconds;
  timerEnd = null;
  els.startBtn.textContent = 'Iniciar';
  els.timerStatus.textContent = 'Pronto para começar';
  updateTimerDisplay();
}

function tick() {
  if (!isRunning || !timerEnd) return;
  remainingSeconds = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  updateTimerDisplay();
  if (remainingSeconds <= 0) {
    finishCycle();
  }
}

function updateTimerDisplay() {
  els.timeDisplay.textContent = formatTime(remainingSeconds);
  document.title = `${formatTime(remainingSeconds)} | LEME Focus`;
  const progress = totalSeconds ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const degrees = Math.min(360, Math.max(0, progress * 360));
  els.timerRing.style.background = `conic-gradient(var(--blue) ${degrees}deg, rgba(255,255,255,0.13) ${degrees}deg)`;
}

function finishCycle(manual = false) {
  isRunning = false;
  clearInterval(ticker);
  ticker = null;
  const finishedMode = state.mode;
  const minutes = Math.round(totalSeconds / 60);

  if (finishedMode === 'focus') {
    registerFocusSession(minutes, manual);
    state.roundCounter += 1;
  }

  playBell();
  notify(finishedMode === 'focus' ? 'Ciclo de foco concluído' : 'Pausa concluída', nextMessage(finishedMode));

  const next = nextMode(finishedMode);
  setMode(next, false);
  saveState();
  renderAll();

  const shouldAutoStart = (finishedMode === 'focus' && state.settings.autoBreak) || (finishedMode !== 'focus' && state.settings.autoFocus);
  if (shouldAutoStart) startTimer();
  else toast(nextMessage(finishedMode));
}

function nextMode(mode) {
  if (mode === 'focus') {
    return state.roundCounter > 0 && state.roundCounter % state.settings.roundsBeforeLong === 0 ? 'long' : 'short';
  }
  return 'focus';
}

function nextMessage(mode) {
  if (mode === 'focus') return nextMode(mode) === 'long' ? 'Hora de uma pausa longa.' : 'Hora de uma pausa curta.';
  return 'Hora de voltar para o foco.';
}

function registerFocusSession(minutes, manual) {
  const task = state.tasks.find(item => item.id === state.activeTaskId);
  const endedAt = new Date().toISOString();
  state.sessions.unshift({
    id: makeId(),
    mode: 'focus',
    minutes,
    manual,
    startedAt: currentStartedAt || endedAt,
    endedAt,
    taskId: task?.id || null,
    taskTitle: task?.title || 'Foco sem tarefa selecionada',
    client: task?.client || 'Sem cliente'
  });

  if (task) {
    task.completedPomodoros = Number(task.completedPomodoros || 0) + 1;
    if (task.completedPomodoros >= task.estimate) task.done = true;
  }
  currentStartedAt = null;
}

function setMode(mode, reset = true) {
  state.mode = mode;
  saveState();
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  els.modeLabel.textContent = labels[mode];
  if (reset) currentStartedAt = null;
  resetTimer();
}

function addTask(event) {
  event.preventDefault();
  const client = els.clientInput.value.trim();
  const title = els.titleInput.value.trim();
  const estimate = Math.max(1, Number(els.estimateInput.value || 1));
  if (!client || !title) return;

  const task = {
    id: makeId(),
    client,
    title,
    estimate,
    completedPomodoros: 0,
    done: false,
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(task);
  state.activeTaskId = task.id;
  saveState();
  els.titleInput.value = '';
  els.estimateInput.value = 2;
  renderAll();
  toast('Demanda criada e selecionada para foco.');
}

function setActiveTask(id) {
  state.activeTaskId = id;
  saveState();
  renderAll();
}

function toggleDone(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  task.done = !task.done;
  if (task.done && state.activeTaskId === id) state.activeTaskId = null;
  saveState();
  renderAll();
}

function deleteTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  const ok = confirm(`Excluir a demanda "${task.title}"? O histórico já registrado será mantido.`);
  if (!ok) return;
  state.tasks = state.tasks.filter(item => item.id !== id);
  if (state.activeTaskId === id) state.activeTaskId = null;
  saveState();
  renderAll();
}

function editTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  const title = prompt('Nome da tarefa:', task.title)?.trim();
  if (!title) return;
  const client = prompt('Cliente ou projeto:', task.client)?.trim();
  if (!client) return;
  const estimate = Number(prompt('Estimativa de ciclos:', task.estimate));
  task.title = title;
  task.client = client;
  task.estimate = Number.isFinite(estimate) && estimate > 0 ? Math.round(estimate) : task.estimate;
  saveState();
  renderAll();
}

function renderTasks() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filter = els.filterSelect.value;
  let tasks = [...state.tasks];

  if (filter === 'open') tasks = tasks.filter(task => !task.done);
  if (filter === 'done') tasks = tasks.filter(task => task.done);
  if (query) {
    tasks = tasks.filter(task => `${task.client} ${task.title}`.toLowerCase().includes(query));
  }

  if (!tasks.length) {
    els.taskList.innerHTML = '<div class="empty-state">Nenhuma demanda encontrada. Crie uma tarefa para começar a registrar os ciclos de foco.</div>';
    return;
  }

  els.taskList.innerHTML = tasks.map(task => {
    const progress = Math.min(100, Math.round((Number(task.completedPomodoros || 0) / Number(task.estimate || 1)) * 100));
    const statusChip = task.done ? '<span class="done-chip">Concluída</span>' : '<span class="progress-chip">Em produção</span>';
    const active = state.activeTaskId === task.id;
    return `
      <div class="task-card ${active ? 'active' : ''} ${task.done ? 'done' : ''}">
        <div>
          <div class="task-meta">
            <span class="client-chip">${escapeHtml(task.client)}</span>
            ${statusChip}
            <span class="progress-chip">${task.completedPomodoros || 0}/${task.estimate} ciclos</span>
          </div>
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="progress-track"><span class="progress-fill" style="width:${progress}%"></span></div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="active" data-id="${task.id}">${active ? 'Selecionada' : 'Focar'}</button>
          <button class="icon-btn" data-action="done" data-id="${task.id}">${task.done ? 'Reabrir' : 'Concluir'}</button>
          <button class="icon-btn" data-action="edit" data-id="${task.id}">Editar</button>
          <button class="icon-btn" data-action="delete" data-id="${task.id}">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderActiveTask() {
  const task = state.tasks.find(item => item.id === state.activeTaskId);
  if (!task) {
    els.activeTaskPill.textContent = 'Nenhuma demanda selecionada';
    return;
  }
  els.activeTaskPill.innerHTML = `<strong>${escapeHtml(task.client)}</strong>&nbsp;•&nbsp;${escapeHtml(task.title)}`;
}

function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date = new Date()) {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

function isAfter(iso, date) {
  return new Date(iso).getTime() >= date.getTime();
}

function sumMinutes(sessions) {
  return sessions.reduce((total, item) => total + Number(item.minutes || 0), 0);
}

function sessionsByClient(sessions = state.sessions) {
  return sessions.reduce((acc, session) => {
    const client = session.client || 'Sem cliente';
    acc[client] = (acc[client] || 0) + Number(session.minutes || 0);
    return acc;
  }, {});
}

function renderStats() {
  const today = state.sessions.filter(item => isAfter(item.endedAt, getStartOfDay()));
  const week = state.sessions.filter(item => isAfter(item.endedAt, getStartOfWeek()));
  const todayMin = sumMinutes(today);
  const weekMin = sumMinutes(week);
  const open = state.tasks.filter(task => !task.done).length;
  const byClient = sessionsByClient(week.length ? week : state.sessions);
  const top = Object.entries(byClient).sort((a, b) => b[1] - a[1])[0];

  els.todayMinutes.textContent = formatMinutes(todayMin);
  els.todayCycles.textContent = `${today.length} ${today.length === 1 ? 'ciclo concluído' : 'ciclos concluídos'}`;
  els.weekMinutes.textContent = formatMinutes(weekMin);
  els.weekCycles.textContent = `${week.length} ${week.length === 1 ? 'ciclo concluído' : 'ciclos concluídos'}`;
  els.openTasks.textContent = open;
  els.topClient.textContent = top ? top[0] : '-';
}

function renderClientBars() {
  const byClient = sessionsByClient(state.sessions);
  const entries = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 7);
  if (!entries.length) {
    els.clientBars.innerHTML = '<div class="empty-state">Ainda não há tempo registrado por cliente.</div>';
    return;
  }
  const max = Math.max(...entries.map(([, minutes]) => minutes));
  els.clientBars.innerHTML = entries.map(([client, minutes]) => {
    const width = max ? Math.max(6, Math.round((minutes / max) * 100)) : 0;
    return `
      <div class="client-bar-row">
        <div class="client-bar-head"><strong>${escapeHtml(client)}</strong><span>${formatMinutes(minutes)}</span></div>
        <div class="client-bar"><span style="width:${width}%"></span></div>
      </div>
    `;
  }).join('');
}

function renderSessions() {
  const sessions = state.sessions.slice(0, 30);
  if (!sessions.length) {
    els.sessionTable.innerHTML = '<tr><td colspan="4">Nenhuma sessão concluída ainda.</td></tr>';
    return;
  }
  els.sessionTable.innerHTML = sessions.map(session => {
    const date = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(session.endedAt));
    return `
      <tr>
        <td>${date}</td>
        <td>${escapeHtml(session.client)}</td>
        <td>${escapeHtml(session.taskTitle)}</td>
        <td>${formatMinutes(Number(session.minutes || 0))}</td>
      </tr>
    `;
  }).join('');
}

function renderSettings() {
  els.focusMinutes.value = state.settings.focus;
  els.shortMinutes.value = state.settings.short;
  els.longMinutes.value = state.settings.long;
  els.roundsBeforeLong.value = state.settings.roundsBeforeLong;
  els.autoBreak.checked = Boolean(state.settings.autoBreak);
  els.autoFocus.checked = Boolean(state.settings.autoFocus);
}

function renderAll() {
  renderTasks();
  renderActiveTask();
  renderStats();
  renderClientBars();
  renderSessions();
  renderSettings();
  updateTimerDisplay();
}

function saveSettings(event) {
  event.preventDefault();
  state.settings = {
    focus: clampNumber(els.focusMinutes.value, 1, 120, 25),
    short: clampNumber(els.shortMinutes.value, 1, 60, 5),
    long: clampNumber(els.longMinutes.value, 1, 90, 15),
    roundsBeforeLong: clampNumber(els.roundsBeforeLong.value, 1, 12, 4),
    autoBreak: els.autoBreak.checked,
    autoFocus: els.autoFocus.checked
  };
  saveState();
  resetTimer();
  renderAll();
  toast('Ajustes salvos.');
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leme-focus-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== 'object') throw new Error('Arquivo inválido');
      state = {
        ...structuredClone(DEFAULT_STATE),
        ...imported,
        settings: { ...DEFAULT_STATE.settings, ...(imported.settings || {}) },
        tasks: Array.isArray(imported.tasks) ? imported.tasks : [],
        sessions: Array.isArray(imported.sessions) ? imported.sessions : []
      };
      saveState();
      resetTimer();
      renderAll();
      toast('Dados importados com sucesso.');
    } catch {
      toast('Não foi possível importar esse arquivo.');
    }
  };
  reader.readAsText(file);
}

function clearHistory() {
  const ok = confirm('Limpar todo o histórico de sessões? As demandas serão mantidas.');
  if (!ok) return;
  state.sessions = [];
  saveState();
  renderAll();
  toast('Histórico limpo.');
}

function resetAllData() {
  const ok = confirm('Apagar todas as demandas, sessões e ajustes do LEME Focus neste navegador?');
  if (!ok) return;
  state = structuredClone(DEFAULT_STATE);
  saveState();
  resetTimer();
  renderAll();
  toast('Dados apagados.');
}

function playBell() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.65);
  } catch {
    // Navegador bloqueou áudio. Não precisa interromper o app.
  }
}

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/assets/logo-branca.png' });
}

async function requestNotifications() {
  if (!('Notification' in window)) {
    toast('Este navegador não suporta notificações.');
    return;
  }
  const permission = await Notification.requestPermission();
  toast(permission === 'granted' ? 'Avisos ativados.' : 'Avisos não foram ativados.');
}

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 220);
  }, 3200);
}

function wireEvents() {
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  els.startBtn.addEventListener('click', startTimer);
  els.resetBtn.addEventListener('click', resetTimer);
  els.completeBtn.addEventListener('click', () => finishCycle(true));
  els.taskForm.addEventListener('submit', addTask);
  els.searchInput.addEventListener('input', renderTasks);
  els.filterSelect.addEventListener('change', renderTasks);
  els.settingsForm.addEventListener('submit', saveSettings);
  els.exportBtn.addEventListener('click', exportData);
  els.importInput.addEventListener('change', event => importData(event.target.files?.[0]));
  els.notifyBtn.addEventListener('click', requestNotifications);
  els.clearHistoryBtn.addEventListener('click', clearHistory);
  els.resetDataBtn.addEventListener('click', resetAllData);

  els.taskList.addEventListener('click', event => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'active') setActiveTask(id);
    if (action === 'done') toggleDone(id);
    if (action === 'delete') deleteTask(id);
    if (action === 'edit') editTask(id);
  });

  window.addEventListener('beforeunload', () => {
    if (isRunning) {
      pauseTimer();
      saveState();
    }
  });
}

function boot() {
  totalSeconds = getModeSeconds(state.mode);
  remainingSeconds = totalSeconds;
  setMode(state.mode, true);
  wireEvents();
  renderAll();
}

boot();
