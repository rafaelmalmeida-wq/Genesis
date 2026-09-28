function changeTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.getElementById('btn-' + tabId).classList.add('active');
  window.scrollTo(0, 0); // como no iOS: trocar de aba volta ao topo
}

// --- UTILITÁRIOS ---
/** Protege texto digitado pelo usuário antes de ir pra tela (um "<b>" digitado vira texto, não negrito). */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function isoDe(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hojeISO() { return isoDe(new Date()); }
function hojeBR() { return new Date().toLocaleDateString('pt-BR'); }
function brParaISO(br) { const [d, m, y] = (br || '').split('/'); return y ? `${y}-${m}-${d}` : hojeISO(); }
function isoParaBR(iso) { const [y, m, d] = (iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; }
function formatCurrency(value) { return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
let ultimoIdGerado = 0;
/** Id único mesmo que dois itens sejam criados no mesmo milissegundo. */
function novoId() { let id = Date.now(); if (id <= ultimoIdGerado) id = ultimoIdGerado + 1; ultimoIdGerado = id; return id; }

let toastTimer = null;
function toast(msg, ms = 3500) {
  const el = document.getElementById('toast'); if (!el) return;
  el.innerText = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Bando de dados e Migração
let transactions = JSON.parse(localStorage.getItem('lifeos_finances')) || [];
let notes = JSON.parse(localStorage.getItem('lifeos_notes')) || [];
let events = JSON.parse(localStorage.getItem('lifeos_events')) || [];   // compromissos da agenda geral
let recurring = JSON.parse(localStorage.getItem('lifeos_recurring')) || []; // lançamentos recorrentes (modelos)
let tasklists = JSON.parse(localStorage.getItem('lifeos_tasklists')) || [{ id: 'padrao', name: 'Minhas tarefas' }]; // listas de tarefas
let topics = JSON.parse(localStorage.getItem('lifeos_topics')) || [];       // Estudos: temas
let materials = JSON.parse(localStorage.getItem('lifeos_materials')) || []; // Estudos: livros, cursos...
let sessions = JSON.parse(localStorage.getItem('lifeos_sessions')) || [];   // Estudos: sessões (Pomodoro + manuais)
let ritual = JSON.parse(localStorage.getItem('lifeos_ritual')) || { day: '', time: '', roadmap: [], weekStart: '', done: [] }; // estudo semanal de negócios
let assets = JSON.parse(localStorage.getItem('lifeos_assets')) || [];       // Negócios: ativos da carteira
let moves = JSON.parse(localStorage.getItem('lifeos_moves')) || [];         // Negócios: aportes/resgates
let goals = JSON.parse(localStorage.getItem('lifeos_goals')) || [];         // Negócios: metas
let projects = JSON.parse(localStorage.getItem('lifeos_projects')) || [];   // Negócios: projetos
let wealth = JSON.parse(localStorage.getItem('lifeos_wealth')) || { snapshots: {}, indicators: {} }; // patrimônio mês a mês + indicadores manuais
let workouts = JSON.parse(localStorage.getItem('lifeos_workouts')) || [];   // Saúde: treinos
let measures = JSON.parse(localStorage.getItem('lifeos_measures')) || [];   // Saúde: peso e medidas
let hydration = JSON.parse(localStorage.getItem('lifeos_hydration')) || { date: hojeBR(), ml: 0, goal: 2500, dias: {} }; // Saúde: água
let meals = JSON.parse(localStorage.getItem('lifeos_meals')) || [];         // Saúde: refeições
let medical = JSON.parse(localStorage.getItem('lifeos_medical')) || [];     // Saúde: consultas/exames/vacinas/medicamentos
let profile = JSON.parse(localStorage.getItem('lifeos_profile')) || { name: '', initials: '', subtitle: 'Life OS' }; // quem usa o app (nome no cumprimento, iniciais no cabeçalho)
let orders = JSON.parse(localStorage.getItem('lifeos_orders')) || [];   // Primos 3D: pedidos
let clients = JSON.parse(localStorage.getItem('lifeos_clients')) || []; // Primos 3D: clientes
let claudeReqs = JSON.parse(localStorage.getItem('lifeos_clauderequests')) || []; // ✳ pedidos de mudança no app ditados para o Claude

// Migração das tarefas de Strings para Objetos (Estilo Keep Notes)
let tasks = JSON.parse(localStorage.getItem('lifeos_tasks')) || [];
tasks = tasks.map(t => typeof t === 'string' ? { text: t, done: false } : t);

let habits = JSON.parse(localStorage.getItem('lifeos_habits')) || [
  { text: 'Cold Shower', icon: '💧', done: false },
  { text: 'Walk / Sunlight', icon: '🚶‍♂️', done: false },
  { text: 'Meditate', icon: '🧘‍♂️', done: false },
  { text: 'Workout', icon: '🏋️‍♂️', done: false },
  { text: 'Read', icon: '📖', done: false }
];

// Histórico dos hábitos: { date: 'dd/mm/aaaa' (dia a que os "done" atuais pertencem), dias: { 'aaaa-mm-dd': { total, feitos: [nomes] } } }
let habitLog = JSON.parse(localStorage.getItem('lifeos_habitlog')) || { date: hojeBR(), dias: {} };
if (!habitLog.dias) habitLog.dias = {};

// Preferências deste aparelho (não sincronizam): alarme do pomodoro
let prefs = JSON.parse(localStorage.getItem('lifeos_prefs')) || { alarmeTipo: 'sino', alarmeVolume: 70 };
function salvarPrefs() {
  const tipo = document.getElementById('alarme-tipo'); const vol = document.getElementById('alarme-volume');
  if (tipo) prefs.alarmeTipo = tipo.value;
  if (vol) prefs.alarmeVolume = Number(vol.value);
  localStorage.setItem('lifeos_prefs', JSON.stringify(prefs));
}
function carregarPrefsNaTela() {
  const tipo = document.getElementById('alarme-tipo'); const vol = document.getElementById('alarme-volume');
  if (tipo) tipo.value = prefs.alarmeTipo;
  if (vol) vol.value = prefs.alarmeVolume;
}

// --- POMODORO TIMER ---
// { date: 'dd/mm/aaaa', minutes: minutos de hoje, dias: { 'aaaa-mm-dd': minutos } }
let studyData = JSON.parse(localStorage.getItem('lifeos_study')) || { date: hojeBR(), minutes: 0, dias: {} };
if (!studyData.dias) studyData.dias = {};

let pomodoroDuration = parseInt(document.getElementById('pomodoro-input').value) * 60;
let timerTimeLeft = pomodoroDuration;
let timerInterval = null;
let timerEnd = null; // instante em que a sessão termina (funciona mesmo com a aba em segundo plano)
let pomodoroModo = 'foco'; // 'foco' (estudo) | 'meditacao'
function alternarModoPomodoro(modo, el) {
  if (timerInterval) { toast('Pause ou zere o timer antes de trocar o modo.'); return; }
  pomodoroModo = modo; document.querySelectorAll('#pomodoro-modo span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active');
  const input = document.getElementById('pomodoro-input'); input.value = modo === 'meditacao' ? (prefs.meditacaoMin || 10) : (prefs.focoMin || 50);
  document.getElementById('pomodoro-topic').hidden = modo === 'meditacao';
  document.getElementById('pomodoro-title').innerText = modo === 'meditacao' ? '🧘 MEDITAÇÃO' : '⏱ POMODORO';
  updatePomodoroTime();
}

function updatePomodoroTime() {
  const inputVal = parseInt(document.getElementById('pomodoro-input').value);
  if (inputVal > 0 && !timerInterval) {
    if (pomodoroModo === 'meditacao') prefs.meditacaoMin = inputVal; else prefs.focoMin = inputVal; localStorage.setItem('lifeos_prefs', JSON.stringify(prefs));
    pomodoroDuration = inputVal * 60;
    timerTimeLeft = pomodoroDuration;
    updateTimerDisplay();
  }
}

function updateTimerDisplay() {
  const m = Math.floor(timerTimeLeft / 60).toString().padStart(2, '0');
  const s = (timerTimeLeft % 60).toString().padStart(2, '0');
  document.getElementById('timer-display').innerText = `${m}:${s}`;
  document.title = timerInterval ? `${m}:${s} · Genesis` : 'Dashboard Genesis';
}

function updateStudyStats() {
  const h = Math.floor(studyData.minutes / 60);
  const m = studyData.minutes % 60;
  document.getElementById('study-time-today').innerText = `${h}h ${m}m`;
}

function startTimer() {
  if (timerInterval) return;
  prepararAudio(); // o navegador só libera som depois de um clique — este é o clique
  document.getElementById('btn-start-timer').style.display = 'none';
  document.getElementById('btn-pause-timer').style.display = 'inline-block';
  document.getElementById('pomodoro-input').disabled = true;
  timerEnd = Date.now() + timerTimeLeft * 1000;
  timerInterval = setInterval(() => {
    timerTimeLeft = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
    updateTimerDisplay();
    if (timerTimeLeft <= 0) { clearInterval(timerInterval); timerInterval = null; completePomodoro(); }
  }, 500);
  updateTimerDisplay();
}

function pauseTimer() {
  if (timerInterval) timerTimeLeft = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  clearInterval(timerInterval); timerInterval = null;
  document.getElementById('btn-start-timer').style.display = 'inline-block';
  document.getElementById('btn-pause-timer').style.display = 'none';
  updateTimerDisplay();
}

function resetTimer() {
  pauseTimer();
  let inputVal = parseInt(document.getElementById('pomodoro-input').value);
  if (isNaN(inputVal) || inputVal <= 0) inputVal = pomodoroModo === 'meditacao' ? 10 : 50;
  pomodoroDuration = inputVal * 60; timerTimeLeft = pomodoroDuration;
  document.getElementById('pomodoro-input').disabled = false; updateTimerDisplay();
}

function completePomodoro() {
  const mins = Math.round(pomodoroDuration / 60);
  if (pomodoroModo === 'meditacao') {
    resetTimer(); tocarAlarme('sino');
    const idx = habits.findIndex(h => /medita/i.test(h.text));
    if (idx >= 0 && !habits[idx].done) { habits[idx].done = true; salvar('habits', habits); renderFocusTab(); renderJournal(); atualizarSaudacao(); }
    toast(`🧘 ${mins} min de meditação concluídos.${idx >= 0 ? ' Hábito marcado.' : ''}`, 6000);
    return;
  }
  studyData.minutes += mins; salvar('study', studyData);
  const topicSel = document.getElementById('pomodoro-topic'); registrarSessao(topicSel && topicSel.value ? Number(topicSel.value) : '', mins, 'Pomodoro');
  updateStudyStats(); renderJournal(); redesenharEstudos(); resetTimer();
  tocarAlarme();
  toast(`⏱ Sessão concluída! +${mins} min de estudo registrados.`, 6000);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Pomodoro concluído', { body: `+${mins} min de estudo.` }); } catch (e) {}
  }
}

// Alarme gerado pelo próprio navegador (Web Audio) — não depende de arquivo nem de internet
let audioCtx = null;
function prepararAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { console.warn('Áudio indisponível:', e); }
}
function tocarAlarme(tipo = prefs.alarmeTipo, volume = prefs.alarmeVolume) {
  if (tipo === 'mudo' || !volume) return;
  prepararAudio(); if (!audioCtx) return;
  const master = audioCtx.createGain(); master.gain.value = (volume / 100) * 0.6; master.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime;
  const nota = (freq, inicio, dur, forma = 'sine') => {
    const o = audioCtx.createOscillator(); o.type = forma; o.frequency.value = freq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0 + inicio);
    g.gain.exponentialRampToValueAtTime(1, t0 + inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + dur);
    o.connect(g); g.connect(master); o.start(t0 + inicio); o.stop(t0 + inicio + dur + 0.05);
  };
  if (tipo === 'beep') { [0, 0.4, 0.8, 1.2].forEach(i => nota(880, i, 0.22, 'square')); }
  else if (tipo === 'sino') { nota(1046, 0, 1.6); nota(1318, 0.04, 1.6); nota(1568, 0.08, 1.3); nota(1046, 1.3, 2); nota(1318, 1.34, 2); }
  else if (tipo === 'suave') { [523, 659, 784, 1046].forEach((f, i) => nota(f, i * 0.32, 1)); }
  else if (tipo === 'alarme') { for (let i = 0; i < 10; i++) nota(i % 2 ? 660 : 990, i * 0.17, 0.14, 'sawtooth'); }
}
function testarAlarme() { salvarPrefs(); tocarAlarme(); }

// --- RELÓGIO PRINCIPAL E SAUDAÇÃO ---
function updateMainClock() {
  const now = new Date();
  document.getElementById('big-clock').innerText = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  let dateStr = now.toLocaleDateString('pt-BR', options);
  dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  document.getElementById('big-date').innerText = dateStr.replace('-feira', '').replace(',', ' |');
}
setInterval(updateMainClock, 1000); updateMainClock();

const FRASES = [
  'O que você faz todos os dias importa mais do que o que você faz de vez em quando.',
  'Disciplina é escolher entre o que você quer agora e o que você quer mais.',
  'Não é sobre ter tempo. É sobre fazer tempo.',
  'Cuide do processo; o resultado cuida de si.',
  'Uma camada de cada vez, uma peça de cada vez.',
  'Comece onde você está. Use o que você tem. Faça o que você pode.',
  'A melhor hora pra plantar uma árvore foi há 20 anos. A segunda melhor é agora.',
  'Pequenos passos todos os dias somam mais que grandes saltos de vez em quando.',
  'Primeiro a reserva, depois o risco.',
  'Saber e não fazer é ainda não saber.',
  'Você não precisa ver a escada inteira. Só o primeiro degrau.',
  'Simplifique. Depois simplifique de novo.',
  'Descanso também é produtividade.',
  'Quem estuda um pouco todo dia não precisa estudar muito nunca.',
  'Dinheiro é consequência de valor entregue.',
  'Faça hoje o que o você de amanhã vai agradecer.',
  'A consistência vence a intensidade.',
  'Menos pressa, mais direção.',
  'Não compare o seu capítulo 1 com o capítulo 20 de alguém.',
  'Termine o que começou antes de começar o próximo.',
  'Clareza vem da ação, não do pensamento.',
  'Trabalhe em silêncio; deixe o resultado fazer barulho.',
  'O corpo é o primeiro investimento.',
  'Uma boa noite de sono resolve metade dos problemas.',
  'Dizer não é dizer sim para o que importa.',
  'Errar rápido, aprender rápido, ajustar rápido.',
  'O que é medido, melhora.',
  'Foco é dizer não a cem boas ideias.',
  'Grandes coisas nascem de hábitos pequenos.',
  'Hoje é um bom dia pra ser melhor que ontem.'
];
function fraseDoDia() { const d = new Date(); const dia = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); return FRASES[dia % FRASES.length]; }
function renderHabitosRapidos() {
  const el = document.getElementById('habits-quick'); if (!el) return;
  const mini = document.getElementById('progress-text-mini'); if (mini) mini.innerText = habits.length ? `${habits.filter(h => h.done).length}/${habits.length}` : '';
  el.innerHTML = habits.map((h, i) => `<button class="habit-chip ${h.done ? 'on' : ''}" onclick="toggleHabit(${i})" title="${esc(h.text)}">${esc(h.icon)} <span>${esc(h.text)}</span></button>`).join('') || '<small class="item-date">sem hábitos</small>';
}
function atualizarSaudacao() {
  const h = new Date().getHours();
  const saud = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('greeting-text').innerText = profile.name ? `${saud}, ${profile.name}` : `${saud}!`;
  const hoje = hojeISO();
  const entregasHoje = orders.filter(o => pedidoAberto(o) && o.due && o.due <= hoje);
  const imprimindo = orders.filter(o => o.status === 'imprimindo').length;
  const pendentes = tasks.filter(t => !t.done).length;
  const habPend = habits.filter(h => !h.done).length;
  const partes = [];
  partes.push(entregasHoje.length ? `📦 entregar: ${entregasHoje.map(o => o.title).join(', ')}` : '📦 nenhuma entrega hoje');
  if (imprimindo) partes.push(`🖨️ ${imprimindo} imprimindo`);
  const evHoje = events.filter(e => e.date === hoje && !e.done).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  if (evHoje.length) partes.push(`📅 ${evHoje.map(e => `${e.time ? e.time + ' ' : ''}${e.title}`).join(', ')}`);
  partes.push(`✅ ${pendentes} tarefa${pendentes === 1 ? '' : 's'} pendente${pendentes === 1 ? '' : 's'}`);
  partes.push(`🎮 ${habPend} hábito${habPend === 1 ? '' : 's'} a cumprir`);
  document.getElementById('greeting-sub').innerText = partes.join(' · ');
  const fr = document.getElementById('frase-dia'); if (fr) fr.innerText = '“' + fraseDoDia() + '”';
}
setInterval(atualizarSaudacao, 60000);

/** Aplica nome/iniciais na tela (cabeçalho, título da aba, campos da Config). */
function aplicarPerfil() {
  const h = document.getElementById('header-title');
  if (h) h.innerHTML = (profile.initials ? `${esc(profile.initials)} <span style="color:#30d158">·</span> ` : '') + esc(profile.subtitle || 'Life OS');
  const n = document.getElementById('profile-name'); const i = document.getElementById('profile-initials'); const s = document.getElementById('profile-subtitle');
  if (n && document.activeElement !== n) n.value = profile.name || '';
  if (i && document.activeElement !== i) i.value = profile.initials || '';
  if (s && document.activeElement !== s) s.value = profile.subtitle || '';
  if (typeof atualizarSaudacao === 'function' && document.getElementById('greeting-sub')) atualizarSaudacao();
}
function salvarPerfil() {
  profile = { name: document.getElementById('profile-name').value.trim(), initials: document.getElementById('profile-initials').value.trim().slice(0, 12), subtitle: document.getElementById('profile-subtitle').value.trim() || 'Life OS' };
  salvar('profile', profile); aplicarPerfil(); toast(`👤 Perfil salvo${profile.name ? ', ' + profile.name : ''}.`);
}
function atualizarBotaoDia() {
  const btn = document.getElementById('btn-iniciar-dia'); if (!btn) return;
  const feito = localStorage.getItem('lifeos_dia_iniciado') === hojeISO();
  btn.innerText = feito ? '✓ Dia iniciado' : '➔ Iniciar o Dia';
  btn.classList.toggle('done', feito);
}
function iniciarDia() {
  verificarNovoDia();
  localStorage.setItem('lifeos_dia_iniciado', hojeISO()); atualizarBotaoDia();
  changeJournalTab('day', document.querySelector('#journal-tabs span'));
  const hoje = hojeISO();
  const ent = orders.filter(o => pedidoAberto(o) && o.due && o.due <= hoje).length; const pend = tasks.filter(t => !t.done).length;
  toast(`☀️ Bom trabalho hoje! ${ent} entrega${ent === 1 ? '' : 's'} · ${pend} tarefa${pend === 1 ? '' : 's'} pendente${pend === 1 ? '' : 's'} · ${habits.length} hábitos pra cumprir.`, 6000);
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}

/** Virou o dia? Fecha o dia anterior (hábitos → histórico, estudo → histórico) e zera o de hoje. */
function verificarNovoDia() {
  const hoje = hojeBR();
  let mudou = false;
  if (studyData.date !== hoje) {
    if (studyData.minutes > 0) { const k = brParaISO(studyData.date); studyData.dias[k] = (studyData.dias[k] || 0) + studyData.minutes; }
    studyData = { date: hoje, minutes: 0, dias: studyData.dias };
    salvar('study', studyData); mudou = true;
  }
  if (habitLog.date !== hoje) {
    if (habits.length) habitLog.dias[brParaISO(habitLog.date)] = { total: habits.length, feitos: habits.filter(h => h.done).map(h => h.text) };
    habits.forEach(h => h.done = false);
    habitLog.date = hoje;
    salvar('habits', habits); salvar('habitlog', habitLog); mudou = true;
  }
  verificarNovoDiaAgua();
  if (mudou) { renderFocusTab(); updateStudyStats(); renderJournal(); atualizarSaudacao(); }
}

// --- HÁBITOS ---
let currentHabitFilter = 'do';

function changeHabitTab(filter, element) {
  document.querySelectorAll('#habit-tabs span').forEach(el => el.classList.remove('active'));
  element.classList.add('active'); currentHabitFilter = filter; renderFocusTab();
}

/** Dias seguidos cumprindo o hábito (conta hoje se já estiver feito). */
function streakHabito(h) {
  let n = h.done ? 1 : 0;
  const d = new Date(); d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const reg = habitLog.dias[isoDe(d)];
    if (reg && reg.feitos && reg.feitos.includes(h.text)) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

function renderFocusTab() {
  const mainHabits = document.getElementById('main-habits-list'); mainHabits.innerHTML = '';
  let completedHabits = 0; habits.forEach(h => { if (h.done) completedHabits++; });

  let filteredHabits = habits.map((h, i) => ({ ...h, originalIndex: i }));

  // Keep Style: Em "Do" ou "All", mostrar os feitos no final
  if (currentHabitFilter === 'do' || currentHabitFilter === 'all') {
    filteredHabits.sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);
  } else if (currentHabitFilter === 'todo') {
    filteredHabits = filteredHabits.filter(h => !h.done);
  } else if (currentHabitFilter === 'completed') {
    filteredHabits = filteredHabits.filter(h => h.done);
  }

  if (filteredHabits.length === 0) {
    mainHabits.innerHTML = '<li style="color:#8e8e93; font-size:0.85rem;">Nenhum hábito nesta categoria.</li>';
  } else {
    filteredHabits.forEach(h => {
      const streak = streakHabito(h);
      mainHabits.innerHTML += `<li style="color: ${h.done ? '#8e8e93' : '#f5f5f7'};">
        <input type="checkbox" ${h.done ? 'checked' : ''} onclick="toggleHabit(${h.originalIndex})" style="accent-color: #30d158;">
        <span style="opacity: ${h.done ? 0.5 : 1}; cursor: pointer;" onclick="toggleHabit(${h.originalIndex})">${esc(h.icon)}</span>
        <span style="${h.done ? 'text-decoration: line-through; opacity: 0.5' : ''}; cursor: pointer; flex:1;" onclick="toggleHabit(${h.originalIndex})">${esc(h.text)}</span>
        ${streak > 0 ? `<span class="streak" title="${streak} dia(s) seguidos">🔥 ${streak}</span>` : ''}
        <span class="habit-actions"><button class="mini-btn" title="Editar" onclick="editarHabito(${h.originalIndex})">✎</button><button class="mini-btn" title="Apagar" onclick="removerHabito(${h.originalIndex})">✕</button></span>
      </li>`;
    });
  }

  renderHabitosRapidos();
  const progress = habits.length === 0 ? 0 : Math.round((completedHabits / habits.length) * 100);
  document.getElementById('progress-fill').style.width = `${progress}%`;
  document.getElementById('progress-text').innerText = `${progress}% Concluído`;
}

function toggleHabit(index) { habits[index].done = !habits[index].done; salvar('habits', habits); renderFocusTab(); renderJournal(); atualizarSaudacao(); }
function separarIconeTexto(str) {
  const iconMatch = str.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  const icon = iconMatch ? iconMatch[0] : '📌';
  const text = iconMatch ? str.replace(icon, '').trim() : str.trim();
  return { icon, text };
}
function addNewHabit() {
  const newHabit = prompt("Digite o nome do novo hábito (pode começar com um emoji):");
  if (newHabit && newHabit.trim()) {
    const { icon, text } = separarIconeTexto(newHabit);
    habits.push({ text, icon, done: false }); salvar('habits', habits); renderFocusTab(); atualizarSaudacao();
  }
}
function editarHabito(index) {
  const h = habits[index];
  const novo = prompt("Novo nome do hábito:", `${h.icon} ${h.text}`);
  if (novo && novo.trim()) {
    const { icon, text } = separarIconeTexto(novo);
    // mantém o histórico/sequência: renomeia o hábito nos dias já registrados
    Object.values(habitLog.dias).forEach(r => { if (r.feitos) r.feitos = r.feitos.map(f => f === h.text ? text : f); });
    h.icon = icon; h.text = text;
    salvar('habits', habits); salvar('habitlog', habitLog); renderFocusTab();
  }
}
function removerHabito(index) {
  if (!confirm(`Apagar o hábito "${habits[index].text}"?`)) return;
  habits.splice(index, 1); salvar('habits', habits); renderFocusTab(); renderJournal(); atualizarSaudacao();
}

// --- RESUMO (ex-Journals): números reais do período ---
let currentJournal = 'day';
function changeJournalTab(period, element) {
  document.querySelectorAll('#journal-tabs span').forEach(el => el.classList.remove('active'));
  if (element) element.classList.add('active');
  currentJournal = period; renderJournal();
}

function periodoIntervalo(p) {
  const hoje = new Date(); const ini = new Date(hoje); const fim = new Date(hoje);
  if (p === 'week') { const dow = hoje.getDay(); ini.setDate(hoje.getDate() - dow); fim.setDate(ini.getDate() + 6); }
  else if (p === 'month') { ini.setDate(1); fim.setMonth(hoje.getMonth() + 1, 0); }
  else if (p === 'quarter') { const q = Math.floor(hoje.getMonth() / 3) * 3; ini.setMonth(q, 1); fim.setMonth(q + 3, 0); }
  else if (p === 'year') { ini.setMonth(0, 1); fim.setMonth(11, 31); }
  return [isoDe(ini), isoDe(fim)];
}

function dataTransacao(t) { return t.date || (t.id ? isoDe(new Date(t.id)) : hojeISO()); }

function renderJournal() {
  const content = document.getElementById('journal-content'); if (!content) return;
  const [ini, fim] = periodoIntervalo(currentJournal);
  const dentro = iso => iso >= ini && iso <= fim;
  const hoje = hojeISO();

  // hábitos: média de conclusão nos dias do período (inclui hoje ao vivo)
  let dias = 0, soma = 0;
  Object.entries(habitLog.dias).forEach(([d, r]) => { if (dentro(d) && r.total) { dias++; soma += (r.feitos || []).length / r.total; } });
  if (dentro(hoje) && habits.length) { dias++; soma += habits.filter(h => h.done).length / habits.length; }
  const habPct = dias ? Math.round(soma / dias * 100) : 0;

  const ped = orders.filter(o => o.status !== 'cancelado' && dentro(o.date));
  const pedR = orders.filter(o => o.paid && dentro(o.paidAt || o.date)).reduce((a, o) => a + (Number(o.price) || 0), 0);
  const tarefasFeitas = tasks.filter(t => t.done && t.doneAt && dentro(t.doneAt.slice(0, 10))).length;
  const tarefasPend = tasks.filter(t => !t.done).length;
  let estudo = 0; Object.entries(studyData.dias).forEach(([d, m]) => { if (dentro(d)) estudo += m; }); if (dentro(hoje)) estudo += studyData.minutes;
  const tr = transactions.filter(t => dentro(dataTransacao(t)));
  const inc = tr.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const exp = tr.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  const nomes = { day: 'Hoje', week: 'Esta semana', month: 'Este mês', quarter: 'Este trimestre', year: 'Este ano' };
  const tile = (icone, valor, rotulo, cor) => `<div class="stat-tile"><span class="stat-icon">${icone}</span><strong style="color:${cor}">${valor}</strong><small>${rotulo}</small></div>`;
  let html = `<div class="stat-period">${nomes[currentJournal]} · ${isoParaBR(ini)}${ini !== fim ? ' a ' + isoParaBR(fim) : ''}</div><div class="stat-grid">`;
  html += tile('🎮', `${habPct}%`, currentJournal === 'day' ? 'hábitos hoje' : 'média de hábitos', '#30d158');
  html += tile('🖨️', `${ped.length}`, `pedido${ped.length === 1 ? '' : 's'} · ${formatCurrency(pedR)} recebido`, COR_PEDIDO);
  html += tile('✅', `${tarefasFeitas}`, `concluída${tarefasFeitas === 1 ? '' : 's'} · ${tarefasPend} pendente${tarefasPend === 1 ? '' : 's'}`, '#0a84ff');
  html += tile('📚', `${Math.floor(estudo / 60)}h ${estudo % 60}m`, 'de estudo', '#bf5af2');
  html += tile('💰', formatCurrency(inc - exp), `↑ ${formatCurrency(inc)} · ↓ ${formatCurrency(exp)}`, inc - exp >= 0 ? '#30d158' : '#ff453a');
  const aportado = moves.filter(m => m.type === 'aporte' && !m.initial && dentro(m.date)).reduce((a, m) => a + m.amount, 0);
  html += tile('🏦', formatCurrency(patrimonioTotal()), `patrimônio · ${formatCurrency(aportado)} aportados`, '#0a84ff');
  const tr_ = workouts.filter(w => dentro(w.date)); const trMin = tr_.reduce((a, w) => a + (w.minutes || 0), 0);
  html += tile('🏋️', `${tr_.length}`, `treino${tr_.length === 1 ? '' : 's'} · ${trMin} min · 💧 ${((hydration.ml || 0) / 1000).toFixed(1).replace('.', ',')} L hoje`, '#30d158');
  html += '</div>';

  if (currentJournal === 'day') {
    const entHoje = orders.filter(o => pedidoAberto(o) && o.due && o.due <= hoje).sort((a, b) => a.due.localeCompare(b.due));
    const pend = tarefasPrioritarias(5);
    html += '<div class="stat-lists">';
    html += `<div><h5>📦 Entregas de hoje</h5>${entHoje.length ? entHoje.map(o => `<div class="stat-line">${o.due < hoje ? '<span class="badge-topay">atrasado</span> ' : ''}${esc(o.title)}${o.clientId ? ` <span class="item-date">· ${esc(clienteNome(o.clientId))}</span>` : ''}</div>`).join('') : '<div class="stat-line muted">nenhuma</div>'}</div>`;
    const evHoje = events.filter(e => e.date === hoje).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    html += `<div><h5>📅 Compromissos de hoje</h5>${evHoje.length ? evHoje.map(e => `<div class="stat-line" style="${e.done ? 'opacity:0.5;text-decoration:line-through' : ''}">${tipoEvento(e.type).icone} <strong>${esc(e.time || '')}</strong> ${esc(e.title)}</div>`).join('') : '<div class="stat-line muted">nenhum</div>'}</div>`;
    html += `<div><h5>✅ Próximas tarefas</h5>${pend.length ? pend.map(t => `<div class="stat-line">${t.starred ? '★' : '•'} ${esc(t.text)}${t.due ? ` <span class="due ${prazoInfo(t).classe}">${esc(prazoInfo(t).rotulo)}</span>` : ''}</div>`).join('') : '<div class="stat-line muted">tudo em dia</div>'}</div>`;
    html += '</div>';
  }
  if (currentJournal === 'week' || currentJournal === 'month') {
    const lista = orders.filter(o => pedidoAberto(o) && o.due && dentro(o.due)).sort((a, b) => a.due.localeCompare(b.due));
    const evs = events.filter(e => dentro(e.date) && !e.done).sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
    html += '<div class="stat-lists">';
    html += `<div><h5>📦 Entregas ${currentJournal === 'week' ? 'da semana' : 'do mês'}</h5>${lista.length ? lista.map(o => `<div class="stat-line"><strong>${diaSemanaCurto(o.due)} ${isoParaBR(o.due).slice(0, 5)}</strong> · ${esc(o.title)}${o.due < hoje ? ' <span class="badge-topay">atrasado</span>' : ''}${o.price ? ` <span style="color:${COR_PEDIDO}">${formatCurrency(o.price)}</span>` : ''}</div>`).join('') : '<div class="stat-line muted">nenhuma</div>'}</div>`;
    html += `<div><h5>📅 Compromissos ${currentJournal === 'week' ? 'da semana' : 'do mês'}</h5>${evs.length ? evs.slice(0, 12).map(e => `<div class="stat-line ${e.date < hoje ? 'muted' : ''}">${tipoEvento(e.type).icone} <strong>${diaSemanaCurto(e.date)} ${isoParaBR(e.date).slice(0, 5)}</strong> · ${esc(e.time || '')} ${esc(e.title)}</div>`).join('') + (evs.length > 12 ? `<div class="stat-line muted">+${evs.length - 12} mais</div>` : '') : '<div class="stat-line muted">nenhum</div>'}</div>`;
    html += '</div>';
  }
  if (currentJournal === 'quarter' || currentJournal === 'year') {
    const porMes = {};
    ped.forEach(o => { const m = o.date.slice(0, 7); porMes[m] = porMes[m] || { n: 0, valor: 0, pagos: 0 }; porMes[m].n++; if (pedidoGeraLancamento(o)) porMes[m].valor += Number(o.price) || 0; if (o.paid) porMes[m].pagos += Number(o.price) || 0; });
    const meses = Object.keys(porMes).sort();
    html += `<div class="stat-lists"><div><h5>🖨️ Pedidos por mês</h5>${meses.length ? meses.map(m => `<div class="stat-line"><strong>${nomeMes(m).slice(0, 3)}</strong> · ${porMes[m].n} pedido${porMes[m].n === 1 ? '' : 's'} · <span style="color:${COR_PEDIDO}">${formatCurrency(porMes[m].valor)}</span> <small style="color:#30d158">(${formatCurrency(porMes[m].pagos)} recebido)</small></div>`).join('') : '<div class="stat-line muted">nenhum</div>'}</div></div>`;
  }
  content.innerHTML = html;
}

// --- AGENDA: TIPOS DE COMPROMISSO ---
const TIPOS_EVENTO = {
  trabalho: { nome: 'Trabalho', cor: '#0a84ff', icone: '💼' },
  pessoal:  { nome: 'Pessoal',  cor: '#bf5af2', icone: '🏠' },
  saude:    { nome: 'Saúde',    cor: '#30d158', icone: '🩺' },
  estudo:   { nome: 'Estudo',   cor: '#ff375f', icone: '📚' },
  negocios: { nome: 'Negócios', cor: '#ffd60a', icone: '📈' },
  social:   { nome: 'Social',   cor: '#ffb340', icone: '🎉' },
  outro:    { nome: 'Outro',    cor: '#8e8e93', icone: '📌' }
};
const COR_PEDIDO = '#ff9f0a'; // entregas da Primos 3D no calendário
function tipoEvento(t) { return TIPOS_EVENTO[t] || TIPOS_EVENTO.outro; }
function diaSemanaCurto(iso) { const [y, m, d] = iso.split('-'); return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); }
function rotuloData(iso) {
  const hoje = hojeISO(); const am = new Date(); am.setDate(am.getDate() + 1);
  if (iso === hoje) return 'Hoje'; if (iso === isoDe(am)) return 'Amanhã';
  return `${diaSemanaCurto(iso)} ${isoParaBR(iso).slice(0, 5)}`;
}
function rotuloDataLonga(iso) { const r = rotuloData(iso); return (r === 'Hoje' || r === 'Amanhã' ? r : diaSemanaCurto(iso)) + ' · ' + isoParaBR(iso); }

/** Tudo que acontece num dia (entregas de pedidos + compromissos + tarefas), em ordem de horário. */
function itensDoDia(iso) {
  const itens = [];
  orders.filter(o => o.due === iso && pedidoAberto(o)).forEach(o => itens.push({ kind: 'order', time: '', obj: o }));
  events.filter(e => e.date === iso).forEach(e => itens.push({ kind: 'event', time: e.time || '', obj: e }));
  tasks.filter(t => t.due === iso && !t.done).forEach(t => itens.push({ kind: 'task', time: '', obj: t }));
  return itens.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

// --- CALENDÁRIO COM HORÁRIO ---
const monthYearEl = document.getElementById('month-year');
const calendarDaysEl = document.getElementById('calendar-days');
let currentDate = new Date(); let selectedModalDate = '';

function renderCalendar() {
  const month = currentDate.getMonth(); const year = currentDate.getFullYear();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  monthYearEl.innerText = `${months[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay(); const lastDay = new Date(year, month + 1, 0).getDate();
  const hoje = hojeISO();
  let daysHTML = '';
  for (let x = 0; x < firstDayIndex; x++) daysHTML += `<div class="calendar-day empty"></div>`;

  for (let i = 1; i <= lastDay; i++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const itens = itensDoDia(iso);
    const cores = itens.map(it => it.kind === 'order' ? COR_PEDIDO : it.kind === 'task' ? COR_TAREFA : tipoEvento(it.obj.type).cor);
    const dots = cores.slice(0, 4).map(c => `<span class="day-dot" style="background:${c}"></span>`).join('') + (cores.length > 4 ? '<span class="day-more">+</span>' : '');
    daysHTML += `<div class="calendar-day ${iso === hoje ? 'today' : ''} ${itens.length ? 'has-items' : ''}" onclick="openDayModal(${year}, ${month + 1}, ${i})" title="${itens.length ? itens.length + ' item(ns)' : ''}">${i}<div class="day-dots">${dots}</div></div>`;
  }
  calendarDaysEl.innerHTML = daysHTML;
}
document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
function irParaHoje() { currentDate = new Date(); renderCalendar(); }

function openDayModal(year, month, day) {
  const m = month.toString().padStart(2, '0'); const d = day.toString().padStart(2, '0');
  selectedModalDate = `${year}-${m}-${d}`;
  document.getElementById('modal-date-title').innerText = `${diaSemanaCurto(selectedModalDate)}, ${d}/${m}/${year}`;

  const itens = itensDoDia(selectedModalDate);
  const modalList = document.getElementById('modal-shift-list'); modalList.innerHTML = '';

  if (itens.length === 0) {
    modalList.innerHTML = '<li style="justify-content:center; color:#8e8e93; background: transparent; border:none;">Nada marcado neste dia.</li>';
  } else {
    itens.forEach(it => {
      if (it.kind === 'order') {
        const o = it.obj; const st = statusPedido(o.status); const cli = clienteNome(o.clientId);
        modalList.innerHTML += `<li class="shift-item" style="border-left-color:${COR_PEDIDO}; cursor:pointer" onclick="closeModal(); editarPedido(${o.id})"><span style="display:flex; flex-direction:column;"><strong>📦 Entrega${o.due < hojeISO() ? ' (atrasada)' : ''}</strong><span style="font-size:0.85rem;">${esc(o.title)}${cli ? ' — ' + esc(cli) : ''}</span></span><small class="category-badge" style="color:${st.cor}; background:${st.cor}22">${st.icone} ${st.nome}</small></li>`;
      } else if (it.kind === 'task') {
        const t = it.obj;
        modalList.innerHTML += `<li class="shift-item" style="border-left-color:${COR_TAREFA}"><span style="display:flex; flex-direction:column;"><strong>✅ Tarefa${t.starred ? ' ★' : ''}</strong><span style="font-size:0.85rem;">${esc(t.text)}</span></span><small class="category-badge">${esc(listaNome(t.list))}</small></li>`;
      } else {
        const e = it.obj; const tp = tipoEvento(e.type);
        modalList.innerHTML += `<li class="shift-item" style="border-left-color:${tp.cor}; ${e.done ? 'opacity:0.5' : ''}"><span style="display:flex; flex-direction:column;"><strong>${tp.icone} ${esc(e.time || 'dia todo')}${e.endTime ? '–' + esc(e.endTime) : ''}</strong><span style="font-size:0.85rem; ${e.done ? 'text-decoration:line-through' : ''}">${esc(e.title)}</span></span><small class="category-badge" style="color:${tp.cor}; background:${tp.cor}22">${tp.nome}</small></li>`;
      }
    });
  }
  document.getElementById('day-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('day-modal').style.display = 'none'; }
function goToAddOrder() { closeModal(); changeTab('primos'); cancelarEdicaoPedido(); document.getElementById('order-due').value = selectedModalDate; setTimeout(() => { document.getElementById('order-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('order-title').focus(); }, 100); }
function goToAddEvent() { closeModal(); cancelarEdicaoEvento(); document.getElementById('event-date').value = selectedModalDate; setTimeout(() => { document.getElementById('event-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('event-title').focus(); }, 100); }
document.getElementById('day-modal').addEventListener('click', (e) => { if (e.target.id === 'day-modal') closeModal(); });

// --- AGENDA: COMPROMISSOS ---
let eventFilter = 'proximos';
function preencherTiposEvento() {
  const sel = document.getElementById('event-type'); if (!sel) return;
  sel.innerHTML = Object.entries(TIPOS_EVENTO).map(([k, t]) => `<option value="${k}">${t.icone} ${t.nome}</option>`).join('');
}
document.getElementById('event-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('event-id').value;
  const dados = {
    title: document.getElementById('event-title').value.trim(),
    date: document.getElementById('event-date').value,
    time: document.getElementById('event-time').value,
    endTime: document.getElementById('event-end').value,
    type: document.getElementById('event-type').value,
    notes: document.getElementById('event-notes').value.trim()
  };
  if (!dados.title || !dados.date) return;
  if (id) { const ev = events.find(x => String(x.id) === id); if (ev) Object.assign(ev, dados); }
  else events.push({ id: novoId(), done: false, ...dados });
  salvar('events', events); cancelarEdicaoEvento(); redesenharAgenda();
  toast(id ? '📅 Compromisso atualizado.' : '📅 Compromisso adicionado.');
});
function cancelarEdicaoEvento() {
  document.getElementById('event-form').reset(); document.getElementById('event-id').value = '';
  document.getElementById('event-form-title').innerText = 'Novo compromisso';
  document.getElementById('event-submit').innerText = 'Adicionar compromisso';
  document.getElementById('event-cancel').hidden = true;
}
function editarEvento(id) {
  const ev = events.find(x => x.id === id); if (!ev) return;
  changeTab('home');
  document.getElementById('event-id').value = ev.id;
  document.getElementById('event-title').value = ev.title; document.getElementById('event-date').value = ev.date;
  document.getElementById('event-time').value = ev.time || ''; document.getElementById('event-end').value = ev.endTime || '';
  document.getElementById('event-type').value = ev.type || 'outro'; document.getElementById('event-notes').value = ev.notes || '';
  document.getElementById('event-form-title').innerText = 'Editar compromisso';
  document.getElementById('event-submit').innerText = 'Salvar alterações';
  document.getElementById('event-cancel').hidden = false;
  document.getElementById('event-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function concluirEvento(id) { const ev = events.find(x => x.id === id); if (!ev) return; ev.done = !ev.done; salvar('events', events); redesenharAgenda(); }
function removerEvento(id) { const ev = events.find(x => x.id === id); if (!ev || !confirm(`Apagar "${ev.title}"?`)) return; events = events.filter(x => x.id !== id); salvar('events', events); redesenharAgenda(); }
function filtrarEventos(f, el) { eventFilter = f; document.querySelectorAll('#event-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderEvents(); }

function renderEvents() {
  const list = document.getElementById('event-list'); if (!list) return; list.innerHTML = '';
  const hoje = hojeISO();
  let lista = [...events];
  if (eventFilter === 'proximos') lista = lista.filter(e => e.date >= hoje && !e.done);
  else if (eventFilter === 'passados') lista = lista.filter(e => e.date < hoje);
  else if (eventFilter === 'concluidos') lista = lista.filter(e => e.done);
  lista.sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
  if (eventFilter === 'passados') lista.reverse();
  if (!lista.length) { list.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhum compromisso aqui.</li>'; return; }
  let ultimaData = '';
  lista.forEach(e => {
    if (e.date !== ultimaData) { ultimaData = e.date; list.innerHTML += `<li class="date-sep">${rotuloData(e.date)} <small>${isoParaBR(e.date)}</small></li>`; }
    const tp = tipoEvento(e.type);
    list.innerHTML += `<li class="event-item" style="border-left-color:${tp.cor}; ${e.done ? 'opacity:0.5' : ''}">
      <div class="transaction-info" style="flex:1">
        <span style="${e.done ? 'text-decoration:line-through' : ''}">${tp.icone} <strong>${esc(e.time || 'dia todo')}${e.endTime ? '–' + esc(e.endTime) : ''}</strong> ${esc(e.title)}</span>
        <small class="category-badge" style="color:${tp.cor}; background:${tp.cor}22">${tp.nome}</small>${e.notes ? `<small class="item-notes">${esc(e.notes)}</small>` : ''}
      </div>
      <div class="item-actions"><button class="mini-btn" title="${e.done ? 'Reabrir' : 'Concluir'}" onclick="concluirEvento(${e.id})">${e.done ? '↩' : '✓'}</button><button class="mini-btn" title="Editar" onclick="editarEvento(${e.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerEvento(${e.id})">✕</button></div>
    </li>`;
  });
}
function redesenharAgenda() { renderCalendar(); renderEvents(); renderJournal(); atualizarSaudacao(); }

// --- FINANÇAS ---
const CATEGORIAS = {
  income:  ['Primos 3D', 'Engenharia / Projetos', 'Salário CLT', 'Faturamento CNPJ', 'Investimentos', 'Reembolso', 'Outros'],
  expense: ['Filamento / Insumos', 'Primos 3D (outros)', 'Custos Fixos', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Assinaturas', 'Educação', 'Lazer', 'Investimentos', 'Impostos', 'Empresa', 'Outros']
};
let finMonth = hojeISO().slice(0, 7); // 'aaaa-mm' do mês em exibição
let finModo = 'mes';                  // 'mes' | 'tudo'
let finFilter = 'todas';
let finSearch = '';

function transacaoPendente(t) { return t.pending === true; }
function nomeMes(ym) { const [y, m] = ym.split('-'); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase()); }
function somaMes(ym, delta) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return isoDe(d).slice(0, 7); }
function mudarMesFin(delta) { finMonth = somaMes(finMonth, delta); redesenharFinancas(); }
function irParaMesAtual() { finMonth = hojeISO().slice(0, 7); redesenharFinancas(); }
function alternarModoFin(modo, el) { finModo = modo; document.querySelectorAll('#fin-modo span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); redesenharFinancas(); }
function filtrarFin(f, el) { finFilter = f; document.querySelectorAll('#fin-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderFinances(); }
function buscarFin(v) { finSearch = (v || '').trim().toLowerCase(); renderFinances(); }

/** Lançamentos do escopo em exibição (mês escolhido ou tudo). */
function transacoesEscopo() { return finModo === 'mes' ? transactions.filter(t => dataTransacao(t).startsWith(finMonth)) : [...transactions]; }

function preencherCategorias(manterAtual) {
  const tipo = document.getElementById('type').value; const sel = document.getElementById('category');
  const atual = manterAtual ? sel.value : '';
  sel.innerHTML = CATEGORIAS[tipo].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('') + '<option value="__outra">✏️ Outra (digitar)</option>';
  if (atual && [...sel.options].some(o => o.value === atual)) sel.value = atual;
  document.getElementById('category-custom').hidden = sel.value !== '__outra';
}
function categoriaEscolhida() {
  const sel = document.getElementById('category');
  if (sel.value === '__outra') return document.getElementById('category-custom').value.trim() || 'Outros';
  return sel.value;
}
function definirCategoriaNaTela(cat) {
  const sel = document.getElementById('category');
  if ([...sel.options].some(o => o.value === cat)) { sel.value = cat; document.getElementById('category-custom').hidden = true; }
  else { sel.value = '__outra'; document.getElementById('category-custom').hidden = false; document.getElementById('category-custom').value = cat; }
}

function updateFinanceValues() {
  const esc_ = transacoesEscopo();
  const income = esc_.filter(t => t.type === 'income' && !transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const expense = esc_.filter(t => t.type === 'expense' && !transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const aReceber = esc_.filter(t => t.type === 'income' && transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const aPagar = esc_.filter(t => t.type === 'expense' && transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const total = income - expense;
  const acumulado = transactions.filter(t => !transacaoPendente(t)).reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
  document.getElementById('total-income').innerText = formatCurrency(income);
  document.getElementById('total-expense').innerText = formatCurrency(expense);
  document.getElementById('net-balance').innerText = formatCurrency(total);
  document.getElementById('net-balance').style.color = total >= 0 ? '#30d158' : '#ff453a';
  const pend = document.getElementById('total-pending'); if (pend) pend.innerText = formatCurrency(aReceber);
  const lbl = document.getElementById('fin-month-label'); if (lbl) lbl.innerText = finModo === 'mes' ? nomeMes(finMonth) : 'Todo o período';
  const extra = document.getElementById('fin-extra');
  if (extra) extra.innerHTML = `<span>💸 A pagar: <strong style="color:#ff453a">${formatCurrency(aPagar)}</strong></span><span>📈 Previsto (saldo + a receber − a pagar): <strong style="color:${total + aReceber - aPagar >= 0 ? '#30d158' : '#ff453a'}">${formatCurrency(total + aReceber - aPagar)}</strong></span><span>🏦 Saldo acumulado (tudo): <strong style="color:${acumulado >= 0 ? '#30d158' : '#ff453a'}">${formatCurrency(acumulado)}</strong></span>`;
}

function renderFinances() {
  const tList = document.getElementById('transaction-list'); tList.innerHTML = '';
  let lista = transacoesEscopo();
  if (finFilter === 'receitas') lista = lista.filter(t => t.type === 'income');
  else if (finFilter === 'despesas') lista = lista.filter(t => t.type === 'expense');
  else if (finFilter === 'pendentes') lista = lista.filter(transacaoPendente);
  if (finSearch) lista = lista.filter(t => `${t.desc} ${t.category || ''} ${t.notes || ''}`.toLowerCase().includes(finSearch));
  lista.sort((a, b) => dataTransacao(b).localeCompare(dataTransacao(a)) || (b.id || 0) - (a.id || 0));
  if (!lista.length) { tList.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhum lançamento aqui.</li>'; }
  lista.forEach(t => {
    const i = transactions.indexOf(t); const pend = transacaoPendente(t); const dePedido = transacaoDePedido(t);
    const li = document.createElement('li'); li.classList.add(t.type === 'income' ? 'income-item' : 'expense-item'); if (pend) li.classList.add('pending-item');
    li.innerHTML = `<div class="transaction-info" style="flex:1"><span>${dePedido ? '📦 ' : ''}${t.recurringId ? '🔁 ' : ''}${esc(t.desc)}${pend ? (t.type === 'income' ? ' <span class="badge-unpaid">a receber</span>' : ' <span class="badge-topay">a pagar</span>') : ''}</span>
        <small class="category-badge">${esc(t.category || 'Sem categoria')}</small> <small class="item-date">${isoParaBR(dataTransacao(t))}</small>${t.notes ? `<small class="item-notes">${esc(t.notes)}</small>` : ''}</div>
      <div class="item-actions"><strong style="margin-right:6px; color:${t.type === 'income' ? '#30d158' : '#ff453a'}">${t.type === 'income' ? '+' : '−'}${formatCurrency(t.amount)}</strong><button class="mini-btn ${pend ? '' : 'on'}" title="${pend ? 'Marcar como efetivado' : 'Voltar para pendente'}" onclick="alternarEfetivado(${i})">💵</button><button class="mini-btn" title="Editar" onclick="editarTransacao(${i})">✎</button><button class="mini-btn" title="Apagar" onclick="removeFinance(${i})">✕</button></div>`;
    tList.appendChild(li);
  });
  renderCategoriasFin(); renderMesesFin();
}

function renderCategoriasFin() {
  const el = document.getElementById('fin-categorias'); if (!el) return;
  const esc_ = transacoesEscopo().filter(t => !transacaoPendente(t));
  const bloco = (tipo, cor, titulo) => {
    const mapa = {}; esc_.filter(t => t.type === tipo).forEach(t => { const c = t.category || 'Sem categoria'; mapa[c] = (mapa[c] || 0) + t.amount; });
    const itens = Object.entries(mapa).sort((a, b) => b[1] - a[1]); const total = itens.reduce((a, [, v]) => a + v, 0);
    if (!itens.length) return `<div class="cat-block"><h5>${titulo}</h5><div class="stat-line muted">nada ainda</div></div>`;
    return `<div class="cat-block"><h5>${titulo} · ${formatCurrency(total)}</h5>` + itens.map(([c, v]) => `<div class="cat-row"><span class="cat-name">${esc(c)}</span><div class="cat-bar"><div style="width:${Math.round(v / total * 100)}%; background:${cor}"></div></div><span class="cat-val">${formatCurrency(v)} <small>${Math.round(v / total * 100)}%</small></span></div>`).join('') + '</div>';
  };
  el.innerHTML = bloco('expense', '#ff453a', '💸 Despesas') + bloco('income', '#30d158', '💰 Receitas');
}

function renderMesesFin() {
  const el = document.getElementById('fin-meses'); if (!el) return;
  const base = finModo === 'mes' ? finMonth : hojeISO().slice(0, 7);
  const meses = []; for (let i = 5; i >= 0; i--) meses.push(somaMes(base, -i));
  const dados = meses.map(m => { const ts = transactions.filter(t => !transacaoPendente(t) && dataTransacao(t).startsWith(m)); return { m, inc: ts.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0), exp: ts.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0) }; });
  const max = Math.max(1, ...dados.map(d => Math.max(d.inc, d.exp)));
  el.innerHTML = dados.map(d => `<div class="mes-col ${d.m === finMonth && finModo === 'mes' ? 'atual' : ''}" onclick="finMonth='${d.m}'; finModo='mes'; redesenharFinancas();" title="Receitas ${formatCurrency(d.inc)} · Despesas ${formatCurrency(d.exp)}">
      <div class="mes-bars"><div class="mes-bar inc" style="height:${Math.round(d.inc / max * 100)}%"></div><div class="mes-bar exp" style="height:${Math.round(d.exp / max * 100)}%"></div></div>
      <small>${nomeMes(d.m).slice(0, 3)}</small><small class="mes-saldo" style="color:${d.inc - d.exp >= 0 ? '#30d158' : '#ff453a'}">${formatCurrency(d.inc - d.exp).replace('R$', '').trim()}</small></div>`).join('');
}

document.getElementById('type').addEventListener('change', () => preencherCategorias(false));
document.getElementById('category').addEventListener('change', () => { document.getElementById('category-custom').hidden = document.getElementById('category').value !== '__outra'; if (!document.getElementById('category-custom').hidden) document.getElementById('category-custom').focus(); });
document.getElementById('finance-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('finance-id').value;
  const dados = {
    desc: document.getElementById('desc').value.trim(),
    amount: parseFloat(document.getElementById('amount').value),
    date: document.getElementById('fin-date').value || hojeISO(),
    type: document.getElementById('type').value,
    category: categoriaEscolhida(),
    notes: document.getElementById('fin-notes').value.trim(),
    pending: document.getElementById('fin-pending').checked
  };
  if (!dados.desc || isNaN(dados.amount)) return;
  if (id) { const t = transactions.find(x => String(x.id) === id); if (t) Object.assign(t, dados); }
  else transactions.push({ id: novoId(), ...dados });
  salvar('finances', transactions); cancelarEdicaoFin(); redesenharFinancas();
  toast(id ? '💰 Lançamento atualizado.' : '💰 Lançamento adicionado.');
});
function cancelarEdicaoFin() {
  document.getElementById('finance-form').reset(); document.getElementById('finance-id').value = '';
  document.getElementById('fin-date').value = hojeISO(); preencherCategorias(false);
  document.getElementById('finance-form-title').innerText = 'Nova Transação';
  document.getElementById('finance-submit').innerText = 'Adicionar Registro';
  document.getElementById('finance-cancel').hidden = true;
}
function editarTransacao(index) {
  const t = transactions[index]; if (!t) return;
  if (transacaoDePedido(t)) { editarPedido(t.id); toast('📦 Este lançamento vem de um pedido da Primos 3D — edite o pedido.'); return; }
  changeTab('finances');
  document.getElementById('finance-id').value = t.id; document.getElementById('desc').value = t.desc; document.getElementById('amount').value = t.amount;
  document.getElementById('fin-date').value = dataTransacao(t); document.getElementById('type').value = t.type; preencherCategorias(false); definirCategoriaNaTela(t.category || 'Outros');
  document.getElementById('fin-notes').value = t.notes || ''; document.getElementById('fin-pending').checked = transacaoPendente(t);
  document.getElementById('finance-form-title').innerText = 'Editar lançamento';
  document.getElementById('finance-submit').innerText = 'Salvar alterações';
  document.getElementById('finance-cancel').hidden = false;
  document.getElementById('desc').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('desc').focus();
}
function alternarEfetivado(index) {
  const t = transactions[index]; if (!t) return;
  if (transacaoDePedido(t)) { alternarPagoPedido(t.id); return; }
  t.pending = !transacaoPendente(t); if (!t.pending) t.date = hojeISO();
  salvar('finances', transactions); redesenharFinancas();
  toast(t.pending ? '⏳ Voltou para pendente.' : '💵 Efetivado hoje.');
}
function removeFinance(index) {
  const t = transactions[index];
  if (transacaoDePedido(t)) { toast('📦 Este lançamento vem de um pedido — para tirar de Finanças, cancele ou apague o pedido na aba Primos 3D.', 6000); return; }
  if (!confirm(`Apagar "${t.desc}"?`)) return;
  transactions.splice(index, 1); salvar('finances', transactions); redesenharFinancas();
}
function redesenharFinancas() { updateFinanceValues(); renderFinances(); renderRecorrentes(); renderJournal(); }

// --- FINANÇAS: RECORRENTES ---
// Modelo: { id, desc, amount, type, category, day, active, since: 'aaaa-mm' }
// Todo mês (a partir de "since"), gera o lançamento do mês como pendente (a pagar / a receber). Você confirma com 💵.
function gerarRecorrentes() {
  const mesAtual = hojeISO().slice(0, 7); let criou = 0;
  recurring.filter(r => r.active !== false && (!r.since || r.since <= mesAtual)).forEach(r => {
    // já existe neste mês? (gerado antes, ou lançado à mão com o mesmo nome e tipo)
    if (transactions.some(t => dataTransacao(t).startsWith(mesAtual) && (t.recurringId === r.id || (t.type === r.type && t.desc.trim().toLowerCase() === r.desc.trim().toLowerCase())))) return;
    const [y, m] = mesAtual.split('-').map(Number); const ultimo = new Date(y, m, 0).getDate();
    const dia = Math.min(Math.max(1, Number(r.day) || 1), ultimo);
    transactions.push({ id: novoId(), date: `${mesAtual}-${String(dia).padStart(2, '0')}`, desc: r.desc, amount: r.amount, type: r.type, category: r.category, pending: true, recurringId: r.id });
    criou++;
  });
  if (criou) { salvar('finances', transactions); toast(`🔁 ${criou} lançamento${criou > 1 ? 's' : ''} recorrente${criou > 1 ? 's' : ''} gerado${criou > 1 ? 's' : ''} para ${nomeMes(mesAtual)}.`, 5000); }
  return criou > 0;
}
function preencherCategoriasRec() {
  const tipo = document.getElementById('rec-type').value; const sel = document.getElementById('rec-category');
  sel.innerHTML = CATEGORIAS[tipo].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
document.getElementById('rec-type').addEventListener('change', preencherCategoriasRec);
document.getElementById('rec-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('rec-id').value;
  const dados = { desc: document.getElementById('rec-desc').value.trim(), amount: parseFloat(document.getElementById('rec-amount').value), type: document.getElementById('rec-type').value, category: document.getElementById('rec-category').value, day: parseInt(document.getElementById('rec-day').value) || 1 };
  if (!dados.desc || isNaN(dados.amount)) return;
  if (id) { const r = recurring.find(x => String(x.id) === id); if (r) Object.assign(r, dados); }
  else recurring.push({ id: novoId(), active: true, since: hojeISO().slice(0, 7), ...dados });
  salvar('recurring', recurring); cancelarEdicaoRec(); gerarRecorrentes(); redesenharFinancas();
});
function cancelarEdicaoRec() { document.getElementById('rec-form').reset(); document.getElementById('rec-id').value = ''; preencherCategoriasRec(); document.getElementById('rec-submit').innerText = 'Adicionar recorrente'; document.getElementById('rec-cancel').hidden = true; }
function editarRecorrente(id) {
  const r = recurring.find(x => x.id === id); if (!r) return;
  document.getElementById('rec-id').value = r.id; document.getElementById('rec-desc').value = r.desc; document.getElementById('rec-amount').value = r.amount;
  document.getElementById('rec-type').value = r.type; preencherCategoriasRec(); document.getElementById('rec-category').value = r.category; document.getElementById('rec-day').value = r.day;
  document.getElementById('rec-submit').innerText = 'Salvar recorrente'; document.getElementById('rec-cancel').hidden = false; document.getElementById('rec-desc').focus();
}
function alternarRecorrente(id) { const r = recurring.find(x => x.id === id); if (!r) return; r.active = r.active === false; salvar('recurring', recurring); if (r.active) gerarRecorrentes(); redesenharFinancas(); }
function removerRecorrente(id) {
  const r = recurring.find(x => x.id === id); if (!r || !confirm(`Apagar a recorrente "${r.desc}"? (os lançamentos já gerados ficam)`)) return;
  recurring = recurring.filter(x => x.id !== id); salvar('recurring', recurring); redesenharFinancas();
}
function renderRecorrentes() {
  const ul = document.getElementById('rec-list'); if (!ul) return; ul.innerHTML = '';
  if (!recurring.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhuma recorrente. Ex: aluguel, internet, salário CLT, assinatura.</li>'; return; }
  [...recurring].sort((a, b) => (a.day || 0) - (b.day || 0)).forEach(r => {
    const off = r.active === false;
    ul.innerHTML += `<li class="${r.type === 'income' ? 'income-item' : 'expense-item'}" style="${off ? 'opacity:0.45' : ''}"><div class="transaction-info" style="flex:1"><span>🔁 ${esc(r.desc)}${off ? ' <small class="item-date">(pausada)</small>' : ''}</span><small class="category-badge">${esc(r.category)}</small> <small class="item-date">todo dia ${r.day}</small></div>
      <div class="item-actions"><strong style="margin-right:6px; color:${r.type === 'income' ? '#30d158' : '#ff453a'}">${formatCurrency(r.amount)}</strong><button class="mini-btn ${off ? '' : 'on'}" title="${off ? 'Reativar' : 'Pausar'}" onclick="alternarRecorrente(${r.id})">${off ? '▶' : '⏸'}</button><button class="mini-btn" title="Editar" onclick="editarRecorrente(${r.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerRecorrente(${r.id})">✕</button></div></li>`;
  });
}

// ============================================================================
// PRIMOS 3D — pedidos e clientes da empresa de impressão 3D
// Pedido:  { id, date (criado), clientId, title, qty, material, color, printer, price, due (prazo), status, paid, paidAt, notes }
// Cliente: { id, name, phone, email, city, notes, date }
// Pedido com valor que já saiu do orçamento vira receita em Finanças com o MESMO id
// (categoria "Primos 3D"), "a receber" até marcar 💵. Orçamento/cancelado não entram em Finanças.
// ============================================================================
const STATUS_PEDIDO = {
  orcamento:  { nome: 'Orçamento',  icone: '📝', cor: '#8e8e93' },
  aprovado:   { nome: 'Aprovado',   icone: '👍', cor: '#0a84ff' },
  imprimindo: { nome: 'Imprimindo', icone: '🖨️', cor: '#ff9f0a' },
  pronto:     { nome: 'Pronto',     icone: '✅', cor: '#30d158' },
  entregue:   { nome: 'Entregue',   icone: '📦', cor: '#64d2ff' },
  cancelado:  { nome: 'Cancelado',  icone: '✕',  cor: '#ff453a' }
};
const FLUXO_PEDIDO = ['orcamento', 'aprovado', 'imprimindo', 'pronto', 'entregue'];
const MATERIAIS_3D = ['PLA', 'PLA Silk', 'PLA Matte', 'PETG', 'ABS', 'ASA', 'TPU', 'Outro'];
const IMPRESSORAS_3D = ['Bambu A1 #1 (AMS Lite)', 'Bambu A1 #2 (AMS Lite)', 'Anycubic Kobra X'];
let orderFilter = 'abertos';
let orderSearch = '';

function statusPedido(s) { return STATUS_PEDIDO[s] || STATUS_PEDIDO.orcamento; }
function pedidoAberto(o) { return o.status !== 'entregue' && o.status !== 'cancelado'; }
function pedidoGeraLancamento(o) { return (Number(o.price) || 0) > 0 && o.status !== 'orcamento' && o.status !== 'cancelado'; }
function clienteNome(id) { const c = clients.find(x => x.id === id); return c ? c.name : ''; }
function transacaoDePedido(t) { return orders.some(o => o.id === t.id); }

/** Mantém o lançamento em Finanças igual ao pedido (valor, data, pago/a receber) — ou tira de lá se o pedido não gera receita. */
function sincronizarLancamentoPedido(o) {
  const i = transactions.findIndex(t => t.id === o.id);
  if (!pedidoGeraLancamento(o)) { if (i >= 0) transactions.splice(i, 1); return; }
  let t = transactions[i];
  if (!t) { t = { id: o.id, type: 'income', category: 'Primos 3D' }; transactions.push(t); }
  const cli = clienteNome(o.clientId);
  t.desc = `Primos 3D: ${o.title}${cli ? ' — ' + cli : ''}`; t.amount = Number(o.price) || 0; t.pending = !o.paid;
  t.date = o.paid ? (o.paidAt || o.date) : (o.due || o.date);
}

function preencherSelectsPrimos() {
  const cli = document.getElementById('order-client');
  if (cli) {
    const atual = cli.value;
    cli.innerHTML = '<option value="">— sem cliente —</option>' + [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') + '<option value="__novo">＋ Novo cliente (digitar)</option>';
    if ([...cli.options].some(o => o.value === atual)) cli.value = atual;
    document.getElementById('order-client-new').hidden = cli.value !== '__novo';
  }
  const f = (id, lista, vazio) => { const s = document.getElementById(id); if (s && !s.options.length) s.innerHTML = (vazio ? `<option value="">${vazio}</option>` : '') + lista.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join(''); };
  f('order-material', MATERIAIS_3D); f('order-printer', IMPRESSORAS_3D, '— a definir —');
  const st = document.getElementById('order-status');
  if (st && !st.options.length) st.innerHTML = Object.entries(STATUS_PEDIDO).map(([k, s]) => `<option value="${k}">${s.icone} ${s.nome}</option>`).join('');
}
document.getElementById('order-client').addEventListener('change', () => {
  const novo = document.getElementById('order-client').value === '__novo';
  document.getElementById('order-client-new').hidden = !novo; if (novo) document.getElementById('order-client-new').focus();
});

// --- Pedidos ---
document.getElementById('order-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('order-id').value;
  const title = document.getElementById('order-title').value.trim(); if (!title) return;
  let clientId = document.getElementById('order-client').value;
  if (clientId === '__novo') {
    const nome = document.getElementById('order-client-new').value.trim();
    if (!nome) { toast('Digite o nome do novo cliente.'); document.getElementById('order-client-new').focus(); return; }
    const c = { id: novoId(), name: nome, phone: '', email: '', city: '', notes: '', date: hojeISO() };
    clients.push(c); salvar('clients', clients); clientId = c.id;
  } else clientId = clientId ? Number(clientId) : null;
  const dados = {
    clientId, title,
    qty: parseInt(document.getElementById('order-qty').value) || 1,
    material: document.getElementById('order-material').value,
    color: document.getElementById('order-color').value.trim(),
    printer: document.getElementById('order-printer').value,
    price: parseFloat(document.getElementById('order-price').value) || 0,
    due: document.getElementById('order-due').value,
    status: document.getElementById('order-status').value || 'orcamento',
    notes: document.getElementById('order-notes').value.trim()
  };
  let o;
  if (id) { o = orders.find(x => String(x.id) === id); if (!o) return; Object.assign(o, dados); }
  else { o = { id: novoId(), date: hojeISO(), paid: false, paidAt: null, ...dados }; orders.push(o); }
  sincronizarLancamentoPedido(o);
  salvar('orders', orders); salvar('finances', transactions);
  cancelarEdicaoPedido(); redesenharPrimos();
  toast(id ? '📦 Pedido atualizado.' : `📦 Pedido registrado (${statusPedido(o.status).nome.toLowerCase()}).`);
});
function cancelarEdicaoPedido() {
  document.getElementById('order-form').reset(); document.getElementById('order-id').value = '';
  preencherSelectsPrimos(); document.getElementById('order-client-new').hidden = true;
  document.getElementById('order-form-title').innerText = 'Novo pedido';
  document.getElementById('order-submit').innerText = 'Registrar pedido';
  document.getElementById('order-cancel').hidden = true;
}
function editarPedido(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  changeTab('primos'); preencherSelectsPrimos();
  document.getElementById('order-id').value = o.id;
  document.getElementById('order-client').value = o.clientId && clients.some(c => c.id === o.clientId) ? String(o.clientId) : '';
  document.getElementById('order-client-new').hidden = true;
  document.getElementById('order-title').value = o.title; document.getElementById('order-qty').value = o.qty || 1;
  document.getElementById('order-material').value = o.material || 'PLA'; document.getElementById('order-color').value = o.color || '';
  document.getElementById('order-printer').value = o.printer || ''; document.getElementById('order-price').value = o.price || '';
  document.getElementById('order-due').value = o.due || ''; document.getElementById('order-status').value = o.status || 'orcamento';
  document.getElementById('order-notes').value = o.notes || '';
  document.getElementById('order-form-title').innerText = 'Editar pedido';
  document.getElementById('order-submit').innerText = 'Salvar alterações';
  document.getElementById('order-cancel').hidden = false;
  document.getElementById('order-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
/** ▶ leva o pedido para a próxima etapa: orçamento → aprovado → imprimindo → pronto → entregue. */
function avancarPedido(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  const i = FLUXO_PEDIDO.indexOf(o.status); if (i < 0 || i >= FLUXO_PEDIDO.length - 1) return;
  o.status = FLUXO_PEDIDO[i + 1];
  sincronizarLancamentoPedido(o); salvar('orders', orders); salvar('finances', transactions); redesenharPrimos();
  const st = statusPedido(o.status); toast(`${st.icone} ${o.title}: ${st.nome.toLowerCase()}.`);
}
function alternarPagoPedido(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  if (!pedidoGeraLancamento(o)) { toast('💵 Para marcar como pago, o pedido precisa ter valor e sair do orçamento (▶ aprovar).', 5000); return; }
  o.paid = !o.paid; o.paidAt = o.paid ? hojeISO() : null;
  sincronizarLancamentoPedido(o); salvar('orders', orders); salvar('finances', transactions); redesenharPrimos();
  toast(o.paid ? `💵 ${o.title}: pago.` : `⏳ ${o.title} voltou para "a receber".`);
}
function removerPedido(id) {
  const o = orders.find(x => x.id === id); if (!o || !confirm(`Apagar o pedido "${o.title}"? (o lançamento em Finanças também sai)`)) return;
  orders = orders.filter(x => x.id !== id); transactions = transactions.filter(t => t.id !== id);
  salvar('orders', orders); salvar('finances', transactions); redesenharPrimos();
}
function filtrarPedidos(f, el) { orderFilter = f; document.querySelectorAll('#order-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderPedidos(); }
function buscarPedidos(v) { orderSearch = (v || '').trim().toLowerCase(); renderPedidos(); }

function renderPedidos() {
  const ul = document.getElementById('order-list'); if (!ul) return;
  const hoje = hojeISO();
  let lista = [...orders];
  if (orderFilter === 'abertos') lista = lista.filter(o => pedidoAberto(o) && o.status !== 'orcamento');
  else if (orderFilter === 'orcamentos') lista = lista.filter(o => o.status === 'orcamento');
  else if (orderFilter === 'receber') lista = lista.filter(o => pedidoGeraLancamento(o) && !o.paid);
  else if (orderFilter === 'entregues') lista = lista.filter(o => o.status === 'entregue' || o.status === 'cancelado');
  if (orderSearch) lista = lista.filter(o => `${o.title} ${clienteNome(o.clientId)} ${o.material || ''} ${o.color || ''} ${o.printer || ''} ${o.notes || ''}`.toLowerCase().includes(orderSearch));
  // abertos: prazo mais próximo primeiro (sem prazo no fim); demais: mais recentes primeiro
  if (orderFilter === 'abertos' || orderFilter === 'receber') lista.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.id - b.id);
  else lista.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
  if (!lista.length) { ul.innerHTML = '<li class="empty-row">Nenhum pedido aqui.</li>'; return; }
  ul.innerHTML = lista.map(o => {
    const st = statusPedido(o.status); const cli = clienteNome(o.clientId); const aberto = pedidoAberto(o);
    const i = FLUXO_PEDIDO.indexOf(o.status); const prox = aberto && i >= 0 && i < FLUXO_PEDIDO.length - 1 ? statusPedido(FLUXO_PEDIDO[i + 1]) : null;
    const prazo = !o.due ? '' : aberto && o.due < hoje ? `<span class="badge-topay">atrasado · ${isoParaBR(o.due).slice(0, 5)}</span>` : aberto && o.due === hoje ? '<span class="badge-unpaid">entregar hoje</span>' : `<span class="item-date">📅 ${rotuloData(o.due)}</span>`;
    const pago = pedidoGeraLancamento(o) ? (o.paid ? '<span class="badge-paid">pago</span>' : '<span class="badge-unpaid">a receber</span>') : '';
    const detalhes = [cli ? '👤 ' + esc(cli) : '', [o.material, o.color].filter(Boolean).map(esc).join(' · '), o.printer ? '🖨️ ' + esc(o.printer) : ''].filter(Boolean).join('  ·  ');
    return `<li class="order-item" style="border-left-color:${st.cor}; ${o.status === 'cancelado' ? 'opacity:0.5' : ''}">
      <div class="transaction-info" style="flex:1; min-width:0">
        <span><strong>${esc(o.title)}</strong>${o.qty > 1 ? ` <span class="item-date">×${o.qty}</span>` : ''}</span>
        <span class="order-tags"><span class="status-badge" style="color:${st.cor}; background:${st.cor}22">${st.icone} ${st.nome}</span>${pago}${prazo}</span>
        ${detalhes ? `<small class="item-notes">${detalhes}</small>` : ''}${o.notes ? `<small class="item-notes">${linkify(esc(o.notes))}</small>` : ''}
      </div>
      <div class="item-actions">${o.price ? `<strong style="margin-right:6px">${formatCurrency(o.price)}</strong>` : ''}${prox ? `<button class="mini-btn" title="Avançar para: ${prox.nome}" onclick="avancarPedido(${o.id})">▶</button>` : ''}<button class="mini-btn ${o.paid ? 'on' : ''}" title="${o.paid ? 'Marcar como não pago' : 'Marcar como pago'}" onclick="alternarPagoPedido(${o.id})">💵</button><button class="mini-btn" title="Editar" onclick="editarPedido(${o.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerPedido(${o.id})">✕</button></div>
    </li>`;
  }).join('');
}

// --- Clientes ---
document.getElementById('client-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const dados = {
    name: document.getElementById('client-name').value.trim(),
    phone: document.getElementById('client-phone').value.trim(),
    email: document.getElementById('client-email').value.trim(),
    city: document.getElementById('client-city').value.trim(),
    notes: document.getElementById('client-notes').value.trim()
  };
  if (!dados.name) return;
  if (id) {
    const c = clients.find(x => String(x.id) === id); if (!c) return; Object.assign(c, dados);
    orders.filter(o => o.clientId === c.id).forEach(sincronizarLancamentoPedido); // nome novo na descrição do lançamento
    salvar('finances', transactions);
  } else clients.push({ id: novoId(), date: hojeISO(), ...dados });
  salvar('clients', clients); cancelarEdicaoCliente(); redesenharPrimos();
  toast(id ? '👤 Cliente atualizado.' : '👤 Cliente cadastrado.');
});
function cancelarEdicaoCliente() {
  document.getElementById('client-form').reset(); document.getElementById('client-id').value = '';
  document.getElementById('client-form-title').innerText = 'Novo cliente';
  document.getElementById('client-submit').innerText = 'Cadastrar cliente';
  document.getElementById('client-cancel').hidden = true;
}
function editarCliente(id) {
  const c = clients.find(x => x.id === id); if (!c) return;
  document.getElementById('client-id').value = c.id; document.getElementById('client-name').value = c.name;
  document.getElementById('client-phone').value = c.phone || ''; document.getElementById('client-email').value = c.email || '';
  document.getElementById('client-city').value = c.city || ''; document.getElementById('client-notes').value = c.notes || '';
  document.getElementById('client-form-title').innerText = 'Editar cliente';
  document.getElementById('client-submit').innerText = 'Salvar alterações';
  document.getElementById('client-cancel').hidden = false;
  document.getElementById('client-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function removerCliente(id) {
  const c = clients.find(x => x.id === id); if (!c) return;
  const n = orders.filter(o => o.clientId === id).length;
  if (!confirm(`Apagar o cliente "${c.name}"?${n ? ` Os ${n} pedido(s) dele continuam, sem cliente.` : ''}`)) return;
  clients = clients.filter(x => x.id !== id);
  orders.filter(o => o.clientId === id).forEach(o => { o.clientId = null; sincronizarLancamentoPedido(o); });
  salvar('clients', clients); if (n) { salvar('orders', orders); salvar('finances', transactions); }
  redesenharPrimos();
}
function novoPedidoParaCliente(id) {
  cancelarEdicaoPedido(); document.getElementById('order-client').value = String(id);
  document.getElementById('order-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('order-title').focus();
}
/** Link de WhatsApp a partir do telefone (só números; DDD sem o 55 ganha o 55). */
function linkWhatsApp(tel) { let d = String(tel || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d.length >= 12 ? `https://wa.me/${d}` : ''; }

function renderClientes() {
  const ul = document.getElementById('client-list'); if (!ul) return;
  if (!clients.length) { ul.innerHTML = '<li class="empty-row">Nenhum cliente ainda. Cadastre aqui ou direto no pedido (＋ Novo cliente).</li>'; return; }
  ul.innerHTML = [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => {
    const ped = orders.filter(o => o.clientId === c.id && o.status !== 'cancelado');
    const total = ped.filter(pedidoGeraLancamento).reduce((a, o) => a + (Number(o.price) || 0), 0);
    const wa = linkWhatsApp(c.phone);
    const contato = [c.phone ? (wa ? `<a href="${wa}" target="_blank" rel="noopener">📱 ${esc(c.phone)}</a>` : '📱 ' + esc(c.phone)) : '', c.email ? '✉️ ' + esc(c.email) : '', c.city ? '📍 ' + esc(c.city) : ''].filter(Boolean).join('  ·  ');
    return `<li class="client-item">
      <div class="transaction-info" style="flex:1; min-width:0">
        <span><strong>${esc(c.name)}</strong> <span class="item-date">${ped.length} pedido${ped.length === 1 ? '' : 's'}${total ? ' · ' + formatCurrency(total) : ''}</span></span>
        ${contato ? `<small class="item-notes client-contact">${contato}</small>` : ''}${c.notes ? `<small class="item-notes">${esc(c.notes)}</small>` : ''}
      </div>
      <div class="item-actions"><button class="mini-btn" title="Novo pedido para este cliente" onclick="novoPedidoParaCliente(${c.id})">＋📦</button><button class="mini-btn" title="Editar" onclick="editarCliente(${c.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerCliente(${c.id})">✕</button></div>
    </li>`;
  }).join('');
}

// --- Painel do módulo ---
function renderPainelPrimos() {
  const el = document.getElementById('primos-dash'); if (!el) return;
  const mes = hojeISO().slice(0, 7); const hoje = hojeISO();
  const producao = orders.filter(o => pedidoAberto(o) && o.status !== 'orcamento');
  const imprimindo = orders.filter(o => o.status === 'imprimindo').length;
  const atrasados = producao.filter(o => o.due && o.due < hoje).length;
  const orc = orders.filter(o => o.status === 'orcamento').length;
  const aReceber = orders.filter(o => pedidoGeraLancamento(o) && !o.paid); const totalReceber = aReceber.reduce((a, o) => a + (Number(o.price) || 0), 0);
  const recebidoMes = orders.filter(o => o.paid && (o.paidAt || '').startsWith(mes)).reduce((a, o) => a + (Number(o.price) || 0), 0);
  const tile = (icone, valor, rotulo, cor) => `<div class="stat-tile"><span class="stat-icon">${icone}</span><strong style="color:${cor}">${valor}</strong><small>${rotulo}</small></div>`;
  el.innerHTML = '<div class="stat-grid">'
    + tile('📦', `${producao.length}`, `em produção · ${imprimindo} imprimindo${atrasados ? ` · <span style="color:#ff453a">${atrasados} atrasado${atrasados === 1 ? '' : 's'}</span>` : ''}`, '#0a84ff')
    + tile('📝', `${orc}`, `orçamento${orc === 1 ? '' : 's'} aguardando`, '#8e8e93')
    + tile('⏳', formatCurrency(totalReceber), `a receber (${aReceber.length})`, '#ff9f0a')
    + tile('💵', formatCurrency(recebidoMes), 'recebido este mês', '#30d158')
    + tile('👤', `${clients.length}`, `cliente${clients.length === 1 ? '' : 's'}`, '#bf5af2')
    + '</div>';
}
function renderPrimos() { preencherSelectsPrimos(); renderPainelPrimos(); renderPedidos(); renderClientes(); }
function redesenharPrimos() { renderPrimos(); updateFinanceValues(); renderFinances(); renderCalendar(); renderJournal(); atualizarSaudacao(); }

// --- TAREFAS (estilo Google Tasks) ---
// Modelo: { id, text, done, doneAt, list, due: 'aaaa-mm-dd' | '', notes, starred, subtasks: [{ text, done }], createdAt }
// Listas: tasklists = [{ id, name }]  (a lista 'padrao' sempre existe)
const COR_TAREFA = '#0a84ff';
let taskView = 'padrao';      // id da lista em exibição, ou '__star' (com estrela) ou '__all' (todas)
let taskShowDone = false;
let taskExpanded = {};        // id -> subtarefas abertas?

function normalizarTarefas() {
  let mudou = false;
  tasks.forEach((t, i) => {
    if (!t.id) { t.id = Date.now() + i; mudou = true; }
    if (!t.list || !tasklists.some(l => l.id === t.list)) { t.list = 'padrao'; mudou = true; }
    if (!Array.isArray(t.subtasks)) { t.subtasks = []; mudou = true; }
  });
  if (!tasklists.some(l => l.id === 'padrao')) { tasklists.unshift({ id: 'padrao', name: 'Minhas tarefas' }); mudou = true; }
  return mudou;
}
function listaNome(id) { const l = tasklists.find(x => x.id === id); return l ? l.name : 'Minhas tarefas'; }
function tarefasVisiveis() {
  if (taskView === '__star') return tasks.filter(t => t.starred);
  if (taskView === '__all') return [...tasks];
  return tasks.filter(t => t.list === taskView);
}
function prazoInfo(t) {
  if (!t.due) return { classe: '', rotulo: '' };
  const hoje = hojeISO(); const r = rotuloData(t.due);
  if (t.done) return { classe: 'due-done', rotulo: r };
  if (t.due < hoje) return { classe: 'due-late', rotulo: 'Atrasada · ' + r };
  if (t.due === hoje) return { classe: 'due-today', rotulo: 'Hoje' };
  return { classe: 'due-soon', rotulo: r };
}
function ordenarTarefas(a, b) {
  if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
  if (!!a.due !== !!b.due) return a.due ? -1 : 1;
  if (a.due !== b.due) return a.due.localeCompare(b.due);
  return (a.createdAt || a.id || 0) - (b.createdAt || b.id || 0);
}

function renderTaskLists() {
  const el = document.getElementById('task-lists'); if (!el) return;
  const cont = id => tasks.filter(t => !t.done && (id === '__star' ? t.starred : id === '__all' ? true : t.list === id)).length;
  const aba = (id, nome, icone) => `<span class="${taskView === id ? 'active' : ''}" onclick="verLista('${id}', this)">${icone} ${esc(nome)} <small>${cont(id)}</small></span>`;
  el.innerHTML = aba('__star', 'Com estrela', '⭐') + tasklists.map(l => aba(l.id, l.name, '📋')).join('') + aba('__all', 'Todas', '🗂️') +
    `<span class="add-list" onclick="novaLista()">+ Nova lista</span>`;
  const tools = document.getElementById('task-list-tools');
  if (tools) tools.innerHTML = (taskView !== '__star' && taskView !== '__all') ? `<button class="mini-btn" onclick="renomearLista('${taskView}')" title="Renomear lista">✎ ${esc(listaNome(taskView))}</button>${taskView !== 'padrao' ? `<button class="mini-btn" onclick="apagarLista('${taskView}')" title="Apagar lista">✕</button>` : ''}` : '';
  const sel = document.getElementById('task-list-select'); if (sel) sel.innerHTML = tasklists.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  if (sel && !document.getElementById('task-id').value) sel.value = (taskView !== '__star' && taskView !== '__all') ? taskView : 'padrao';
}
function verLista(id, el) { taskView = id; renderTaskLists(); renderTasks(); }
function novaLista() {
  const nome = prompt('Nome da nova lista (ex: Trabalho, Casa, Estudos, Negócios):'); if (!nome || !nome.trim()) return;
  const l = { id: 'l' + novoId(), name: nome.trim() }; tasklists.push(l); salvar('tasklists', tasklists); taskView = l.id; renderTaskLists(); renderTasks();
}
function renomearLista(id) {
  const l = tasklists.find(x => x.id === id); if (!l) return;
  const nome = prompt('Novo nome da lista:', l.name); if (!nome || !nome.trim()) return;
  l.name = nome.trim(); salvar('tasklists', tasklists); renderTaskLists();
}
function apagarLista(id) {
  if (id === 'padrao') return;
  const n = tasks.filter(t => t.list === id).length;
  if (!confirm(`Apagar a lista "${listaNome(id)}"?${n ? ` As ${n} tarefa(s) dela vão para "${listaNome('padrao')}".` : ''}`)) return;
  tasks.forEach(t => { if (t.list === id) t.list = 'padrao'; });
  tasklists = tasklists.filter(l => l.id !== id); salvar('tasklists', tasklists); salvar('tasks', tasks);
  taskView = 'padrao'; renderTaskLists(); renderTasks();
}

document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const text = document.getElementById('task-desc').value.trim(); if (!text) return;
  const dados = {
    text, due: document.getElementById('task-due').value || '',
    list: document.getElementById('task-list-select').value || 'padrao',
    notes: document.getElementById('task-notes').value.trim(),
    starred: document.getElementById('task-star').checked
  };
  const linhas = document.getElementById('task-subtasks').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (id) {
    const t = tasks.find(x => String(x.id) === id); if (!t) return;
    const antigas = t.subtasks || [];
    Object.assign(t, dados); t.subtasks = linhas.map(l => ({ text: l, done: !!(antigas.find(a => a.text === l) || {}).done }));
  } else {
    tasks.push({ id: novoId(), done: false, createdAt: Date.now(), subtasks: linhas.map(l => ({ text: l, done: false })), ...dados });
    if (taskView !== '__star' && taskView !== '__all' && dados.list !== taskView) { taskView = dados.list; }
  }
  salvar('tasks', tasks); cancelarEdicaoTarefa(); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
  toast(id ? '✅ Tarefa atualizada.' : '✅ Tarefa adicionada.');
});
function cancelarEdicaoTarefa() {
  document.getElementById('task-form').reset(); document.getElementById('task-id').value = '';
  if (taskView !== '__star' && taskView !== '__all') document.getElementById('task-list-select').value = taskView;
  document.getElementById('task-form-title').innerText = 'Nova Tarefa';
  document.getElementById('task-submit').innerText = 'Adicionar Tarefa';
  document.getElementById('task-cancel').hidden = true;
  document.getElementById('task-more').open = false;
}
function editarTarefa(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  changeTab('tasks');
  document.getElementById('task-id').value = t.id; document.getElementById('task-desc').value = t.text; document.getElementById('task-due').value = t.due || '';
  document.getElementById('task-list-select').value = t.list || 'padrao'; document.getElementById('task-notes').value = t.notes || '';
  document.getElementById('task-star').checked = !!t.starred; document.getElementById('task-subtasks').value = (t.subtasks || []).map(s => s.text).join('\n');
  document.getElementById('task-form-title').innerText = 'Editar tarefa';
  document.getElementById('task-submit').innerText = 'Salvar alterações';
  document.getElementById('task-cancel').hidden = false;
  document.getElementById('task-more').open = !!(t.notes || (t.subtasks || []).length);
  document.getElementById('task-desc').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('task-desc').focus();
}

function renderTasks() {
  const list = document.getElementById('task-list'); list.innerHTML = '';
  const hoje = hojeISO();
  const vis = tarefasVisiveis();
  const abertas = vis.filter(t => !t.done).sort(ordenarTarefas);
  const feitas = vis.filter(t => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const grupos = [
    ['⚠️ Atrasadas', abertas.filter(t => t.due && t.due < hoje)],
    ['📌 Hoje', abertas.filter(t => t.due === hoje)],
    ['📅 Próximas', abertas.filter(t => t.due && t.due > hoje)],
    ['📝 Sem prazo', abertas.filter(t => !t.due)]
  ];
  if (!abertas.length && !feitas.length) { list.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nada por aqui. Adicione uma tarefa acima.</li>'; return; }
  grupos.forEach(([titulo, itens]) => {
    if (!itens.length) return;
    list.innerHTML += `<li class="date-sep">${titulo} <small>${itens.length}</small></li>`;
    itens.forEach(t => list.innerHTML += linhaTarefa(t));
  });
  if (feitas.length) {
    list.innerHTML += `<li class="date-sep toggle-done" onclick="taskShowDone = !taskShowDone; renderTasks();">${taskShowDone ? '▾' : '▸'} Concluídas <small>${feitas.length}</small></li>`;
    if (taskShowDone) feitas.forEach(t => list.innerHTML += linhaTarefa(t));
  }
}
function linhaTarefa(t) {
  const p = prazoInfo(t); const subs = t.subtasks || []; const feitasSub = subs.filter(s => s.done).length; const aberto = !!taskExpanded[t.id];
  return `<li class="task-item ${t.done ? 'done' : ''}" style="border-left-color:${t.starred ? '#ffd60a' : COR_TAREFA}">
    <div class="task-main">
      <input type="checkbox" ${t.done ? 'checked' : ''} onclick="toggleTask(${t.id})" style="accent-color: #0a84ff;">
      <div class="task-body" onclick="editarTarefa(${t.id})">
        <span class="task-text">${esc(t.text)}</span>
        <div class="task-meta">${p.rotulo ? `<span class="due ${p.classe}">📅 ${esc(p.rotulo)}</span>` : ''}${taskView === '__star' || taskView === '__all' ? `<span class="task-list-tag">📋 ${esc(listaNome(t.list))}</span>` : ''}${subs.length ? `<span class="sub-count" onclick="event.stopPropagation(); taskExpanded[${t.id}] = !taskExpanded[${t.id}]; renderTasks();">☑ ${feitasSub}/${subs.length}</span>` : ''}${!t.done ? `<span class="quick-dates" onclick="event.stopPropagation()"><button class="mini-btn xs" title="Prazo: hoje" onclick="adiarTarefa(${t.id}, 0)">hoje</button><button class="mini-btn xs" title="Prazo: amanhã" onclick="adiarTarefa(${t.id}, 1)">amanhã</button><button class="mini-btn xs" title="Prazo: +7 dias" onclick="adiarTarefa(${t.id}, 7)">+7d</button></span>` : ''}${t.notes ? `<span class="task-notes">${esc(t.notes)}</span>` : ''}</div>
      </div>
      <div class="item-actions"><button class="mini-btn star ${t.starred ? 'on' : ''}" title="${t.starred ? 'Tirar estrela' : 'Marcar com estrela'}" onclick="alternarEstrela(${t.id})">${t.starred ? '★' : '☆'}</button><button class="mini-btn" title="Editar" onclick="editarTarefa(${t.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removeTask(${t.id})">✕</button></div>
    </div>
    ${subs.length && aberto ? `<div class="subtasks">${subs.map((s, i) => `<label class="subtask ${s.done ? 'done' : ''}"><input type="checkbox" ${s.done ? 'checked' : ''} onclick="toggleSubtask(${t.id}, ${i})"> ${esc(s.text)}</label>`).join('')}</div>` : ''}
  </li>`;
}
function adiarTarefa(id, dias) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const d = new Date(); d.setDate(d.getDate() + dias); t.due = isoDe(d);
  salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
  toast(`📅 "${t.text.slice(0, 30)}" → ${rotuloData(t.due)}.`);
}
function toggleTask(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  t.done = !t.done;
  if (t.done) { t.doneAt = new Date().toISOString(); (t.subtasks || []).forEach(s => s.done = true); } else delete t.doneAt;
  salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
}
function toggleSubtask(id, i) {
  const t = tasks.find(x => x.id === id); if (!t || !t.subtasks[i]) return;
  t.subtasks[i].done = !t.subtasks[i].done;
  if (t.subtasks.every(s => s.done) && !t.done) { t.done = true; t.doneAt = new Date().toISOString(); toast('✅ Todas as subtarefas feitas — tarefa concluída.'); }
  salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao();
}
function alternarEstrela(id) { const t = tasks.find(x => x.id === id); if (!t) return; t.starred = !t.starred; salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); }
function removeTask(id) {
  const t = tasks.find(x => x.id === id); if (!t || !confirm(`Apagar "${t.text}"?`)) return;
  tasks = tasks.filter(x => x.id !== id); salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
}
/** Tarefas pendentes em ordem de importância (estrela, atrasada, hoje, com prazo, resto) — usada no Painel. */
function tarefasPrioritarias(n) { return tasks.filter(t => !t.done).sort(ordenarTarefas).slice(0, n); }

// --- NOTAS (estilo Google Keep) ---
// Modelo: { id, title, content, checklist: [{ text, done }] | null, color, labels: [], pinned, archived, createdAt, updatedAt }
const CORES_NOTA = {
  default: { nome: 'Padrão',  bg: '#121212', borda: '#2a2a2a' },
  red:     { nome: 'Vermelho', bg: '#3b1f1f', borda: '#7f1d1d' },
  orange:  { nome: 'Laranja',  bg: '#3d2a14', borda: '#9a3412' },
  yellow:  { nome: 'Amarelo',  bg: '#3d3414', borda: '#a16207' },
  green:   { nome: 'Verde',    bg: '#14301f', borda: '#166534' },
  teal:    { nome: 'Azul-petróleo', bg: '#0f2f33', borda: '#0e7490' },
  blue:    { nome: 'Azul',     bg: '#142a3d', borda: '#1d4ed8' },
  purple:  { nome: 'Roxo',     bg: '#2a1a3d', borda: '#6d28d9' },
  pink:    { nome: 'Rosa',     bg: '#3d1a2e', borda: '#be185d' },
  gray:    { nome: 'Cinza',    bg: '#26272b', borda: '#52525b' }
};
let noteFilter = 'ativas';   // 'ativas' | 'fixadas' | 'arquivadas'
let noteLabel = '';          // marcador selecionado
let noteSearch = '';
let noteColorSel = 'default';
let noteTipo = 'texto';      // 'texto' | 'lista'

function normalizarNotas() {
  let mudou = false;
  notes.forEach((n, i) => {
    if (!n.id) { n.id = novoId() + i; mudou = true; }
    if (!n.color) { n.color = 'default'; mudou = true; }
    if (!Array.isArray(n.labels)) { n.labels = []; mudou = true; }
    if (n.pinned === undefined) { n.pinned = false; mudou = true; }
    if (n.archived === undefined) { n.archived = false; mudou = true; }
    if (!n.createdAt) { n.createdAt = n.id; mudou = true; }
  });
  return mudou;
}
/** Transforma URLs (num texto já escapado) em links clicáveis. */
function linkify(s) { return String(s).replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${u.length > 48 ? u.slice(0, 45) + '…' : u}</a>`); }
function adicionarItemNota(id, input) {
  const n = notes.find(x => x.id === id); const v = (input.value || '').trim(); if (!n || !v) return;
  if (!Array.isArray(n.checklist)) n.checklist = [];
  n.checklist.push({ text: v, done: false }); n.updatedAt = Date.now(); salvar('notes', notes); renderNotes();
  const novo = document.querySelector(`.note-card[data-id="${id}"] .note-add input`); if (novo) novo.focus();
}
function desmarcarTodosNota(id) { const n = notes.find(x => x.id === id); if (!n || !n.checklist) return; n.checklist.forEach(i => i.done = false); n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function limparFeitosNota(id) { const n = notes.find(x => x.id === id); if (!n || !n.checklist) return; if (!confirm('Apagar os itens já marcados desta lista?')) return; n.checklist = n.checklist.filter(i => !i.done); n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function corNota(c) { return CORES_NOTA[c] || CORES_NOTA.default; }
function todosMarcadores() { const s = new Set(); notes.forEach(n => (n.labels || []).forEach(l => s.add(l))); return [...s].sort((a, b) => a.localeCompare(b)); }

function renderPaletaNota() {
  const el = document.getElementById('note-colors'); if (!el) return;
  el.innerHTML = Object.entries(CORES_NOTA).map(([k, c]) => `<span class="color-dot ${noteColorSel === k ? 'sel' : ''}" style="background:${c.bg}; border-color:${c.borda}" title="${c.nome}" onclick="escolherCorNota('${k}')"></span>`).join('');
}
function escolherCorNota(k) { noteColorSel = k; renderPaletaNota(); }
function alternarTipoNota(tipo, el) {
  noteTipo = tipo; document.querySelectorAll('#note-tipo span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active');
  document.getElementById('note-content').hidden = tipo !== 'texto';
  document.getElementById('note-checklist').hidden = tipo !== 'lista';
}
function renderFiltrosNota() {
  const el = document.getElementById('note-labels'); if (!el) return;
  const labels = todosMarcadores();
  el.innerHTML = labels.length ? `<span class="chip ${noteLabel === '' ? 'sel' : ''}" onclick="filtrarMarcador('')">todos</span>` + labels.map(l => `<span class="chip ${noteLabel === l ? 'sel' : ''}" onclick="filtrarMarcador('${esc(l).replace(/'/g, '&#39;')}')">🏷️ ${esc(l)}</span>`).join('') : '';
}
function filtrarMarcador(l) { noteLabel = l; renderNotes(); }
function filtrarNotas(f, el) { noteFilter = f; document.querySelectorAll('#note-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderNotes(); }
function buscarNotas(v) { noteSearch = (v || '').trim().toLowerCase(); renderNotes(); }

document.getElementById('note-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('note-id').value;
  const title = document.getElementById('note-title').value.trim();
  const content = noteTipo === 'texto' ? document.getElementById('note-content').value.trim() : '';
  const linhas = noteTipo === 'lista' ? document.getElementById('note-checklist').value.split('\n').map(s => s.trim()).filter(Boolean) : [];
  if (!title && !content && !linhas.length) return;
  const labels = document.getElementById('note-labels-input').value.split(',').map(s => s.trim()).filter(Boolean);
  const dados = { title, content, color: noteColorSel, labels, pinned: document.getElementById('note-pin').checked, updatedAt: Date.now() };
  if (id) {
    const n = notes.find(x => String(x.id) === id); if (!n) return;
    const antigas = n.checklist || [];
    Object.assign(n, dados); n.checklist = noteTipo === 'lista' ? linhas.map(l => ({ text: l, done: !!(antigas.find(a => a.text === l) || {}).done })) : null;
  } else {
    notes.push({ id: novoId(), archived: false, createdAt: Date.now(), checklist: noteTipo === 'lista' ? linhas.map(l => ({ text: l, done: false })) : null, ...dados });
  }
  salvar('notes', notes); cancelarEdicaoNota(); renderNotes();
  toast(id ? '📝 Nota atualizada.' : '📝 Nota salva.');
});
function cancelarEdicaoNota() {
  document.getElementById('note-form').reset(); document.getElementById('note-id').value = '';
  noteColorSel = 'default'; renderPaletaNota(); alternarTipoNota('texto', document.querySelector('#note-tipo span'));
  document.getElementById('note-form-title').innerText = 'Nova Anotação';
  document.getElementById('note-submit').innerText = 'Salvar Nota';
  document.getElementById('note-cancel').hidden = true;
}
function editarNota(id) {
  const n = notes.find(x => x.id === id); if (!n) return;
  changeTab('notes');
  document.getElementById('note-id').value = n.id; document.getElementById('note-title').value = n.title || '';
  const lista = Array.isArray(n.checklist);
  alternarTipoNota(lista ? 'lista' : 'texto', document.querySelectorAll('#note-tipo span')[lista ? 1 : 0]);
  document.getElementById('note-content').value = n.content || ''; document.getElementById('note-checklist').value = lista ? n.checklist.map(c => c.text).join('\n') : '';
  document.getElementById('note-labels-input').value = (n.labels || []).join(', '); document.getElementById('note-pin').checked = !!n.pinned;
  noteColorSel = n.color || 'default'; renderPaletaNota();
  document.getElementById('note-form-title').innerText = 'Editar nota';
  document.getElementById('note-submit').innerText = 'Salvar alterações';
  document.getElementById('note-cancel').hidden = false;
  document.getElementById('note-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('note-title').focus();
}
function fixarNota(id) { const n = notes.find(x => x.id === id); if (!n) return; n.pinned = !n.pinned; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function arquivarNota(id) { const n = notes.find(x => x.id === id); if (!n) return; n.archived = !n.archived; if (n.archived) n.pinned = false; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); toast(n.archived ? '🗄️ Nota arquivada.' : '📤 Nota desarquivada.'); }
function toggleItemNota(id, i) { const n = notes.find(x => x.id === id); if (!n || !n.checklist || !n.checklist[i]) return; n.checklist[i].done = !n.checklist[i].done; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function removeNote(id) {
  const n = notes.find(x => x.id === id); if (!n || !confirm(`Apagar a nota "${n.title || '(sem título)'}"?`)) return;
  notes = notes.filter(x => x.id !== id); salvar('notes', notes); renderNotes();
}

function renderNotes() {
  const list = document.getElementById('note-list'); if (!list) return; list.innerHTML = '';
  renderFiltrosNota();
  let vis = notes.filter(n => noteFilter === 'arquivadas' ? n.archived : !n.archived);
  if (noteFilter === 'fixadas') vis = vis.filter(n => n.pinned);
  if (noteLabel) vis = vis.filter(n => (n.labels || []).includes(noteLabel));
  if (noteSearch) vis = vis.filter(n => `${n.title || ''} ${n.content || ''} ${(n.checklist || []).map(c => c.text).join(' ')} ${(n.labels || []).join(' ')}`.toLowerCase().includes(noteSearch));
  vis.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const fixadas = vis.filter(n => n.pinned); const outras = vis.filter(n => !n.pinned);
  const cont = document.getElementById('note-count'); if (cont) cont.innerText = `${vis.length} nota${vis.length === 1 ? '' : 's'}`;
  if (!vis.length) { list.innerHTML = '<div class="stat-line muted" style="text-align:center; padding:20px;">Nenhuma nota aqui.</div>'; return; }
  const secao = (titulo, itens) => itens.length ? `<div class="note-section-title">${titulo} <small>${itens.length}</small></div><div class="note-grid">${itens.map(cardNota).join('')}</div>` : '';
  list.innerHTML = (fixadas.length && noteFilter !== 'fixadas' ? secao('📌 Fixadas', fixadas) + secao('Outras', outras) : `<div class="note-grid">${vis.map(cardNota).join('')}</div>`);
}
function cardNota(n) {
  const c = corNota(n.color); const lista = Array.isArray(n.checklist);
  const feitos = lista ? n.checklist.filter(i => i.done).length : 0;
  const quando = new Date(n.updatedAt || n.createdAt || n.id).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `<div class="note-card" data-id="${n.id}" style="background:${c.bg}; border-color:${c.borda}" onclick="editarNota(${n.id})">
    <div class="note-header"><h4>${n.pinned ? '📌 ' : ''}${esc(n.title || (lista ? 'Lista' : 'Sem título'))}</h4><div class="item-actions" onclick="event.stopPropagation()"><button class="mini-btn ${n.pinned ? 'on' : ''}" title="${n.pinned ? 'Desafixar' : 'Fixar'}" onclick="fixarNota(${n.id})">📌</button><button class="mini-btn" title="Editar" onclick="editarNota(${n.id})">✎</button><button class="mini-btn" title="${n.archived ? 'Desarquivar' : 'Arquivar'}" onclick="arquivarNota(${n.id})">${n.archived ? '📤' : '🗄️'}</button><button class="mini-btn" title="Apagar" onclick="removeNote(${n.id})">✕</button></div></div>
    ${lista ? `<div class="note-check" onclick="event.stopPropagation()">${n.checklist.map((i, k) => ({ i, k })).sort((a, b) => (a.i.done === b.i.done ? a.k - b.k : a.i.done ? 1 : -1)).map(({ i, k }) => `<label class="subtask ${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} onclick="toggleItemNota(${n.id}, ${k})"> ${linkify(esc(i.text))}</label>`).join('')}
      <div class="note-add"><input type="text" placeholder="+ novo item" onkeydown="if (event.key === 'Enter') { event.preventDefault(); adicionarItemNota(${n.id}, this); }"><button class="mini-btn" title="Adicionar" onclick="adicionarItemNota(${n.id}, this.previousElementSibling)">＋</button></div>
      <div class="note-tools"><small class="item-date">${feitos}/${n.checklist.length} feitos</small>${feitos ? `<button class="mini-btn xs" onclick="desmarcarTodosNota(${n.id})" title="Desmarcar todos (lista reutilizável)">↺ desmarcar</button><button class="mini-btn xs" onclick="limparFeitosNota(${n.id})" title="Apagar os marcados">🧹 limpar feitos</button>` : ''}</div></div>` : (n.content ? `<div class="note-body">${linkify(esc(n.content))}</div>` : '')}
    <div class="note-foot">${(n.labels || []).map(l => `<span class="chip small">🏷️ ${esc(l)}</span>`).join('')}<small class="item-date" style="margin-left:auto">${quando}</small></div>
  </div>`;
}

// ============================================================================
// ESTUDOS (módulo H)
// topics:    [{ id, name, area, weeklyGoalMin, color, archived, createdAt }]
// materials: [{ id, topicId, title, kind, status, progress, link, notes, createdAt, updatedAt }]
// sessions:  [{ id, topicId, date, minutes, note, createdAt }]   (Pomodoro e lançamentos manuais)
// ritual:    { day, time, roadmap: [texto], weekStart, done: [bool], eventKey }  (estudo semanal de negócios)
// ============================================================================
const AREAS_ESTUDO = { negocios: '📈 Negócios', investimentos: '💰 Investimentos', medicina: '🩺 Medicina', idiomas: '🗣️ Idiomas', tecnologia: '💻 Tecnologia', pessoal: '🌱 Desenvolvimento pessoal', outro: '📌 Outro' };
const TIPOS_MATERIAL = { livro: '📖 Livro', curso: '🎓 Curso', artigo: '📄 Artigo', video: '🎬 Vídeo', podcast: '🎧 Podcast', outro: '📌 Outro' };
const STATUS_MATERIAL = { afazer: 'A fazer', andamento: 'Em andamento', concluido: 'Concluído' };
const CORES_TEMA = ['#0a84ff', '#bf5af2', '#30d158', '#ff375f', '#ffd60a', '#ffb340', '#ff453a', '#8e8e93'];
let materialFilter = 'andamento';

function temaNome(id) { const t = topics.find(x => x.id === id); return t ? t.name : 'Geral'; }
function temaCor(id) { const t = topics.find(x => x.id === id); return t ? t.color : '#8e8e93'; }
function inicioSemanaISO(d) { const x = d ? new Date(d) : new Date(); x.setDate(x.getDate() - x.getDay()); return isoDe(x); }
function minutosNaSemana(topicId) {
  const ini = inicioSemanaISO(); const fim = new Date(); fim.setDate(fim.getDate() + (6 - fim.getDay())); const fimISO = isoDe(fim);
  return sessions.filter(s => s.date >= ini && s.date <= fimISO && (topicId === undefined || s.topicId === topicId)).reduce((a, s) => a + (Number(s.minutes) || 0), 0);
}
function fmtMin(m) { m = Math.round(m || 0); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; }

/** Registra minutos de estudo (Pomodoro ou manual) num tema e no total diário. */
function registrarSessao(topicId, minutes, note, date) {
  const d = date || hojeISO();
  sessions.push({ id: novoId(), topicId: topicId || '', date: d, minutes: Number(minutes) || 0, note: (note || '').trim(), createdAt: Date.now() });
  salvar('sessions', sessions);
  if (date && date !== hojeISO()) { studyData.dias[d] = (studyData.dias[d] || 0) + Number(minutes); salvar('study', studyData); }
}
function streakEstudo() {
  const dias = new Set(sessions.map(s => s.date)); Object.entries(studyData.dias).forEach(([d, m]) => { if (m > 0) dias.add(d); }); if (studyData.minutes > 0) dias.add(hojeISO());
  let n = 0; const d = new Date(); if (!dias.has(isoDe(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) { if (dias.has(isoDe(d))) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}

// --- Temas ---
function preencherTemasSelects() {
  const ativos = topics.filter(t => !t.archived);
  const opts = ativos.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  ['pomodoro-topic', 'session-topic', 'material-topic'].forEach(id => { const s = document.getElementById(id); if (!s) return; const v = s.value; s.innerHTML = (id === 'pomodoro-topic' ? '<option value="">📚 Geral</option>' : '') + opts; if ([...s.options].some(o => o.value === v)) s.value = v; });
  const areas = document.getElementById('topic-area'); if (areas && !areas.options.length) areas.innerHTML = Object.entries(AREAS_ESTUDO).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const kinds = document.getElementById('material-kind'); if (kinds && !kinds.options.length) kinds.innerHTML = Object.entries(TIPOS_MATERIAL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const st = document.getElementById('material-status'); if (st && !st.options.length) st.innerHTML = Object.entries(STATUS_MATERIAL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
}
document.getElementById('topic-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('topic-id').value;
  const dados = { name: document.getElementById('topic-name').value.trim(), area: document.getElementById('topic-area').value, weeklyGoalMin: Math.round((parseFloat(document.getElementById('topic-goal').value) || 0) * 60) };
  if (!dados.name) return;
  if (id) { const t = topics.find(x => String(x.id) === id); if (t) Object.assign(t, dados); }
  else topics.push({ id: novoId(), color: CORES_TEMA[topics.length % CORES_TEMA.length], archived: false, createdAt: Date.now(), ...dados });
  salvar('topics', topics); cancelarEdicaoTema(); redesenharEstudos();
  toast(id ? '📚 Tema atualizado.' : '📚 Tema criado.');
});
function cancelarEdicaoTema() { document.getElementById('topic-form').reset(); document.getElementById('topic-id').value = ''; document.getElementById('topic-submit').innerText = 'Adicionar tema'; document.getElementById('topic-cancel').hidden = true; }
function editarTema(id) { const t = topics.find(x => x.id === id); if (!t) return; document.getElementById('topic-id').value = t.id; document.getElementById('topic-name').value = t.name; document.getElementById('topic-area').value = t.area || 'outro'; document.getElementById('topic-goal').value = t.weeklyGoalMin ? (t.weeklyGoalMin / 60) : ''; document.getElementById('topic-submit').innerText = 'Salvar tema'; document.getElementById('topic-cancel').hidden = false; document.getElementById('topic-name').focus(); }
function arquivarTema(id) { const t = topics.find(x => x.id === id); if (!t) return; t.archived = !t.archived; salvar('topics', topics); redesenharEstudos(); }
function removerTema(id) {
  const t = topics.find(x => x.id === id); if (!t) return;
  const n = materials.filter(m => m.topicId === id).length + sessions.filter(s => s.topicId === id).length;
  if (!confirm(`Apagar o tema "${t.name}"?${n ? ` ${n} material(is)/sessão(ões) ficam como "Geral".` : ''}`)) return;
  materials.forEach(m => { if (m.topicId === id) m.topicId = ''; }); sessions.forEach(s => { if (s.topicId === id) s.topicId = ''; });
  topics = topics.filter(x => x.id !== id); salvar('topics', topics); salvar('materials', materials); salvar('sessions', sessions); redesenharEstudos();
}
function renderTemas() {
  const ul = document.getElementById('topic-list'); if (!ul) return; ul.innerHTML = '';
  if (!topics.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Crie seu primeiro tema — ex: "Gestão de clínicas", "Renda fixa", "Inglês".</li>'; return; }
  topics.forEach(t => {
    const min = minutosNaSemana(t.id); const meta = t.weeklyGoalMin || 0; const pct = meta ? Math.min(100, Math.round(min / meta * 100)) : 0;
    const mats = materials.filter(m => m.topicId === t.id); const emAnd = mats.filter(m => m.status === 'andamento').length;
    ul.innerHTML += `<li class="topic-item" style="border-left-color:${t.color}; ${t.archived ? 'opacity:0.45' : ''}"><div class="transaction-info" style="flex:1"><span>${esc(t.name)} <small class="item-date">${AREAS_ESTUDO[t.area] || ''}${t.archived ? ' · arquivado' : ''}</small></span>
        <div class="cat-bar" style="margin-top:6px"><div style="width:${pct}%; background:${t.color}"></div></div>
        <small class="item-date">${fmtMin(min)} nesta semana${meta ? ` de ${fmtMin(meta)} (${pct}%)` : ' · sem meta'} · ${mats.length} material${mats.length === 1 ? '' : 'is'}${emAnd ? `, ${emAnd} em andamento` : ''}</small></div>
      <div class="item-actions"><button class="mini-btn" title="Editar" onclick="editarTema(${t.id})">✎</button><button class="mini-btn" title="${t.archived ? 'Reativar' : 'Arquivar'}" onclick="arquivarTema(${t.id})">${t.archived ? '📤' : '🗄️'}</button><button class="mini-btn" title="Apagar" onclick="removerTema(${t.id})">✕</button></div></li>`;
  });
}

// --- Materiais ---
document.getElementById('material-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('material-id').value;
  const dados = { title: document.getElementById('material-title').value.trim(), topicId: Number(document.getElementById('material-topic').value) || '', kind: document.getElementById('material-kind').value, status: document.getElementById('material-status').value, progress: Math.max(0, Math.min(100, parseInt(document.getElementById('material-progress').value) || 0)), link: document.getElementById('material-link').value.trim(), notes: document.getElementById('material-notes').value.trim(), updatedAt: Date.now() };
  if (!dados.title) return;
  if (dados.status === 'concluido') dados.progress = 100;
  if (id) { const m = materials.find(x => String(x.id) === id); if (m) Object.assign(m, dados); }
  else materials.push({ id: novoId(), createdAt: Date.now(), ...dados });
  salvar('materials', materials); cancelarEdicaoMaterial(); redesenharEstudos();
  toast(id ? '📖 Material atualizado.' : '📖 Material adicionado.');
});
function cancelarEdicaoMaterial() { document.getElementById('material-form').reset(); document.getElementById('material-id').value = ''; document.getElementById('material-submit').innerText = 'Adicionar material'; document.getElementById('material-cancel').hidden = true; }
function editarMaterial(id) {
  const m = materials.find(x => x.id === id); if (!m) return;
  document.getElementById('material-id').value = m.id; document.getElementById('material-title').value = m.title; document.getElementById('material-topic').value = m.topicId || ''; document.getElementById('material-kind').value = m.kind || 'outro'; document.getElementById('material-status').value = m.status || 'afazer'; document.getElementById('material-progress').value = m.progress || 0; document.getElementById('material-link').value = m.link || ''; document.getElementById('material-notes').value = m.notes || '';
  document.getElementById('material-submit').innerText = 'Salvar material'; document.getElementById('material-cancel').hidden = false; document.getElementById('material-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('material-title').focus();
}
function avancarMaterial(id) {
  const m = materials.find(x => x.id === id); if (!m) return;
  m.status = m.status === 'afazer' ? 'andamento' : m.status === 'andamento' ? 'concluido' : 'afazer';
  if (m.status === 'concluido') m.progress = 100; if (m.status === 'afazer') m.progress = 0; m.updatedAt = Date.now();
  salvar('materials', materials); redesenharEstudos();
}
function progressoMaterial(id, v) { const m = materials.find(x => x.id === id); if (!m) return; m.progress = Math.max(0, Math.min(100, parseInt(v) || 0)); if (m.progress === 100) m.status = 'concluido'; else if (m.progress > 0 && m.status === 'afazer') m.status = 'andamento'; m.updatedAt = Date.now(); salvar('materials', materials); redesenharEstudos(); }
function removerMaterial(id) { const m = materials.find(x => x.id === id); if (!m || !confirm(`Apagar "${m.title}"?`)) return; materials = materials.filter(x => x.id !== id); salvar('materials', materials); redesenharEstudos(); }
/** Revisão espaçada: cria 3 tarefas (1, 7 e 30 dias) na lista "Estudos". */
function agendarRevisao(id) {
  const m = materials.find(x => x.id === id); if (!m) return;
  let lista = tasklists.find(l => l.name.toLowerCase() === 'estudos'); if (!lista) { lista = { id: 'l' + novoId(), name: 'Estudos' }; tasklists.push(lista); salvar('tasklists', tasklists); }
  [1, 7, 30].forEach(n => { const d = new Date(); d.setDate(d.getDate() + n); tasks.push({ id: novoId(), text: `🔁 Revisar: ${m.title} (${n === 1 ? '1 dia' : n + ' dias'})`, done: false, list: lista.id, due: isoDe(d), notes: temaNome(m.topicId), starred: false, subtasks: [], createdAt: Date.now() }); });
  salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderCalendar(); renderJournal(); atualizarSaudacao();
  toast(`🔁 Revisões de "${m.title}" agendadas em Tarefas (1, 7 e 30 dias).`, 5000);
}
function filtrarMateriais(f, el) { materialFilter = f; document.querySelectorAll('#material-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderMateriais(); }
function renderMateriais() {
  const ul = document.getElementById('material-list'); if (!ul) return; ul.innerHTML = '';
  let lista = [...materials]; if (materialFilter !== 'todos') lista = lista.filter(m => m.status === materialFilter);
  lista.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!lista.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhum material aqui.</li>'; return; }
  lista.forEach(m => {
    const cor = temaCor(m.topicId);
    ul.innerHTML += `<li class="material-item" style="border-left-color:${cor}"><div class="transaction-info" style="flex:1"><span>${(TIPOS_MATERIAL[m.kind] || '📌').slice(0, 2)} ${m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener" style="color:#f5f5f7">${esc(m.title)} ↗</a>` : esc(m.title)} <small class="category-badge" style="color:${cor}; background:${cor}22">${esc(temaNome(m.topicId))}</small> <small class="item-date">${STATUS_MATERIAL[m.status] || ''}</small></span>
        <div class="progress-line"><input type="range" min="0" max="100" value="${m.progress || 0}" onchange="progressoMaterial(${m.id}, this.value)" title="Progresso"><small>${m.progress || 0}%</small></div>${m.notes ? `<small class="item-notes">${esc(m.notes)}</small>` : ''}</div>
      <div class="item-actions"><button class="mini-btn" title="Avançar status" onclick="avancarMaterial(${m.id})">${m.status === 'concluido' ? '↩' : '▶'}</button><button class="mini-btn" title="Agendar revisões (1, 7, 30 dias)" onclick="agendarRevisao(${m.id})">🔁</button><button class="mini-btn" title="Editar" onclick="editarMaterial(${m.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerMaterial(${m.id})">✕</button></div></li>`;
  });
}

// --- Sessões ---
document.getElementById('session-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const min = parseInt(document.getElementById('session-minutes').value); if (!min || min <= 0) return;
  const date = document.getElementById('session-date').value || hojeISO();
  registrarSessao(Number(document.getElementById('session-topic').value) || '', min, document.getElementById('session-note').value, date);
  if (date === hojeISO()) { studyData.minutes += min; salvar('study', studyData); }
  document.getElementById('session-form').reset(); document.getElementById('session-date').value = hojeISO();
  updateStudyStats(); redesenharEstudos(); renderJournal(); toast(`📚 +${min} min registrados.`);
});
function removerSessao(id) { const s = sessions.find(x => x.id === id); if (!s || !confirm('Apagar esta sessão?')) return; sessions = sessions.filter(x => x.id !== id); salvar('sessions', sessions); redesenharEstudos(); }
function renderSessoes() {
  const ul = document.getElementById('session-list'); if (!ul) return; ul.innerHTML = '';
  const lista = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 25);
  if (!lista.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhuma sessão ainda. Use o Pomodoro no Painel ou lance acima.</li>'; return; }
  let ultima = '';
  lista.forEach(s => {
    if (s.date !== ultima) { ultima = s.date; const tot = sessions.filter(x => x.date === s.date).reduce((a, x) => a + x.minutes, 0); ul.innerHTML += `<li class="date-sep">${rotuloData(s.date)} <small>${isoParaBR(s.date)} · ${fmtMin(tot)}</small></li>`; }
    ul.innerHTML += `<li style="border-left:4px solid ${temaCor(s.topicId)}"><div class="transaction-info" style="flex:1"><span><strong>${fmtMin(s.minutes)}</strong> · ${esc(temaNome(s.topicId))}</span>${s.note ? `<small class="item-notes">${esc(s.note)}</small>` : ''}</div><div class="item-actions"><button class="mini-btn" title="Apagar" onclick="removerSessao(${s.id})">✕</button></div></li>`;
  });
}

// --- Ritual: estudo semanal de negócios ---
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function garantirRitual() {
  if (!ritual.roadmap) ritual.roadmap = [];
  const semana = inicioSemanaISO();
  if (ritual.weekStart !== semana) { ritual.weekStart = semana; ritual.done = ritual.roadmap.map(() => false); salvar('ritual', ritual); }
  if (!Array.isArray(ritual.done) || ritual.done.length !== ritual.roadmap.length) ritual.done = ritual.roadmap.map((_, i) => !!(ritual.done || [])[i]);
  // compromisso da semana na agenda (tipo estudo): cria, ajusta ou remove conforme o ritual
  const configurado = ritual.day !== undefined && ritual.day !== null && ritual.day !== '';
  const existente = events.find(e => e.ritualKey === semana);
  let mudouEventos = false;
  if (configurado) {
    const [sy, sm, sd] = semana.split('-').map(Number); const d = new Date(sy, sm - 1, sd + Number(ritual.day)); const iso = isoDe(d);
    if (existente) {
      if (!existente.done && (existente.date !== iso || (existente.time || '') !== (ritual.time || ''))) { existente.date = iso; existente.time = ritual.time || ''; mudouEventos = true; }
    } else if (iso >= hojeISO()) {
      events.push({ id: novoId(), title: 'Estudo semanal de negócios', date: iso, time: ritual.time || '', endTime: '', type: 'estudo', notes: 'Ritual do Genesis — roteiro na aba Estudos', done: false, ritualKey: semana });
      mudouEventos = true;
    }
  } else {
    // ritual desligado: some com os eventos automáticos ainda não concluídos
    const antes = events.length; events = events.filter(e => !(e.ritualKey && !e.done)); if (events.length !== antes) mudouEventos = true;
  }
  if (mudouEventos) salvar('events', events);
}
document.getElementById('ritual-form').addEventListener('submit', (e) => {
  e.preventDefault();
  ritual.day = document.getElementById('ritual-day').value; ritual.time = document.getElementById('ritual-time').value;
  ritual.roadmap = document.getElementById('ritual-roadmap').value.split('\n').map(s => s.trim()).filter(Boolean);
  ritual.done = ritual.roadmap.map((_, i) => !!(ritual.done || [])[i]);
  salvar('ritual', ritual); garantirRitual(); redesenharEstudos(); redesenharAgenda(); toast('📅 Ritual semanal salvo.');
});
function toggleRitual(i) { ritual.done[i] = !ritual.done[i]; salvar('ritual', ritual); renderRitual(); }
function salvarInsight() {
  const txt = document.getElementById('ritual-insight').value.trim(); if (!txt) return;
  notes.push({ id: novoId(), title: `Insight da semana · ${isoParaBR(inicioSemanaISO()).slice(0, 5)}`, content: txt, checklist: null, color: 'yellow', labels: ['estudo semanal', 'negócios'], pinned: false, archived: false, createdAt: Date.now(), updatedAt: Date.now() });
  salvar('notes', notes); renderNotes(); document.getElementById('ritual-insight').value = ''; toast('💡 Insight salvo em Notas (marcador "estudo semanal").');
}
function renderRitual() {
  const el = document.getElementById('ritual-week'); if (!el) return;
  const dsel = document.getElementById('ritual-day'); if (dsel && !dsel.options.length) dsel.innerHTML = '<option value="">— sem dia fixo —</option>' + DIAS_SEMANA.map((d, i) => `<option value="${i}">${d}</option>`).join('');
  if (dsel && document.activeElement !== dsel) dsel.value = ritual.day ?? '';
  const tsel = document.getElementById('ritual-time'); if (tsel && document.activeElement !== tsel) tsel.value = ritual.time || '';
  const rm = document.getElementById('ritual-roadmap'); if (rm && document.activeElement !== rm) rm.value = (ritual.roadmap || []).join('\n');
  const feitos = (ritual.done || []).filter(Boolean).length; const total = (ritual.roadmap || []).length;
  el.innerHTML = total ? `<h5>Semana de ${isoParaBR(inicioSemanaISO())} · ${feitos}/${total}</h5>` + ritual.roadmap.map((r, i) => `<label class="subtask ${ritual.done[i] ? 'done' : ''}"><input type="checkbox" ${ritual.done[i] ? 'checked' : ''} onclick="toggleRitual(${i})"> ${esc(r)}</label>`).join('') : '<div class="stat-line muted">Defina o roteiro ao lado (uma linha por item). Ele zera toda semana.</div>';
}

// --- Painel do módulo ---
function renderPainelEstudos() {
  const el = document.getElementById('study-dash'); if (!el) return;
  const semana = minutosNaSemana(); const metaTotal = topics.filter(t => !t.archived).reduce((a, t) => a + (t.weeklyGoalMin || 0), 0);
  const emAnd = materials.filter(m => m.status === 'andamento'); const streak = streakEstudo();
  const proxRev = tasks.filter(t => !t.done && t.text.startsWith('🔁 Revisar') && t.due).sort((a, b) => a.due.localeCompare(b.due))[0];
  const tile = (icone, valor, rotulo, cor) => `<div class="stat-tile"><span class="stat-icon">${icone}</span><strong style="color:${cor}">${valor}</strong><small>${rotulo}</small></div>`;
  let html = '<div class="stat-grid">';
  html += tile('⏱', fmtMin(semana), metaTotal ? `nesta semana · meta ${fmtMin(metaTotal)} (${Math.min(100, Math.round(semana / metaTotal * 100))}%)` : 'nesta semana', '#bf5af2');
  html += tile('🔥', `${streak}`, `dia${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'} estudando`, '#ff9f0a');
  html += tile('📖', `${emAnd.length}`, 'em andamento', '#0a84ff');
  html += tile('🔁', proxRev ? rotuloData(proxRev.due) : '—', proxRev ? proxRev.text.replace('🔁 Revisar: ', '').slice(0, 30) : 'nenhuma revisão marcada', '#30d158');
  html += '</div>';
  const porTema = topics.filter(t => !t.archived).map(t => ({ t, min: minutosNaSemana(t.id) })).filter(x => x.min > 0 || x.t.weeklyGoalMin);
  if (porTema.length) html += '<div class="cat-block" style="margin-top:12px"><h5>Semana por tema</h5>' + porTema.map(({ t, min }) => { const meta = t.weeklyGoalMin || 0; const pct = meta ? Math.min(100, Math.round(min / meta * 100)) : (semana ? Math.round(min / semana * 100) : 0); return `<div class="cat-row"><span class="cat-name">${esc(t.name)}</span><div class="cat-bar"><div style="width:${pct}%; background:${t.color}"></div></div><span class="cat-val">${fmtMin(min)}${meta ? ` <small>/ ${fmtMin(meta)}</small>` : ''}</span></div>`; }).join('') + '</div>';
  el.innerHTML = html;
}
function redesenharEstudos() { preencherTemasSelects(); renderPainelEstudos(); renderTemas(); renderMateriais(); renderSessoes(); renderRitual(); }

// ============================================================================
// NEGÓCIOS & INVESTIMENTOS (módulo G)
// assets:   [{ id, name, institution, klass, current, currentAt, due, rate, notes, archived, createdAt }]
// moves:    [{ id, assetId, date, type: 'aporte'|'resgate', amount, note, financeId }]
// goals:    [{ id, name, target, deadline, linkedTo: 'total'|'reserva'|<assetId>, note }]
// projects: [{ id, name, stage, desc, steps: [{text, done}], contacts, budget, spent, notes, createdAt, updatedAt }]
// wealth:   { snapshots: { 'aaaa-mm': patrimônio }, indicators: { cdi, selic, ipca, ref } }
// ============================================================================
const CLASSES_ATIVO = {
  reserva: { nome: 'Reserva de emergência', cor: '#30d158', icone: '🛟' },
  rf:      { nome: 'Renda fixa',            cor: '#0a84ff', icone: '🏦' },
  fundo:   { nome: 'Fundo',                 cor: '#bf5af2', icone: '🧺' },
  acao:    { nome: 'Ações',                 cor: '#ff375f', icone: '📈' },
  fii:     { nome: 'FIIs',                  cor: '#ffb340', icone: '🏢' },
  cripto:  { nome: 'Cripto',                cor: '#ffd60a', icone: '🪙' },
  prev:    { nome: 'Previdência',           cor: '#2dd4bf', icone: '🧓' },
  outro:   { nome: 'Outro',                 cor: '#8e8e93', icone: '📌' }
};
const ESTAGIOS_PROJETO = { ideia: ['💡', 'Ideia', '#8e8e93'], estudo: ['🔍', 'Em estudo', '#0a84ff'], validacao: ['🧪', 'Validação', '#bf5af2'], andamento: ['🚀', 'Em andamento', '#30d158'], pausado: ['⏸️', 'Pausado', '#ff9f0a'], encerrado: ['🏁', 'Encerrado', '#8e8e93'] };
let projectFilter = 'ativos';

function classeAtivo(k) { return CLASSES_ATIVO[k] || CLASSES_ATIVO.outro; }
function ativoNome(id) { const a = assets.find(x => x.id === id); return a ? a.name : '—'; }
function investidoEm(assetId) { return moves.filter(m => m.assetId === assetId).reduce((a, m) => a + (m.type === 'resgate' ? -m.amount : m.amount), 0); }
function patrimonioTotal() { return assets.filter(a => !a.archived).reduce((a, x) => a + (Number(x.current) || 0), 0); }
function investidoTotal() { return assets.filter(a => !a.archived).reduce((a, x) => a + investidoEm(x.id), 0); }
function totalClasse(k) { return assets.filter(a => !a.archived && a.klass === k).reduce((a, x) => a + (Number(x.current) || 0), 0); }
function pct(v) { return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%'; }

function preencherSelectsNegocios() {
  const ativos = assets.filter(a => !a.archived);
  const opts = ativos.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
  const ms = document.getElementById('move-asset'); if (ms) { const v = ms.value; ms.innerHTML = opts || '<option value="">— cadastre um ativo —</option>'; if ([...ms.options].some(o => o.value === v)) ms.value = v; }
  const gs = document.getElementById('goal-link'); if (gs) { const v = gs.value; gs.innerHTML = '<option value="total">Patrimônio total</option><option value="reserva">Reserva de emergência</option>' + ativos.map(a => `<option value="${a.id}">Ativo: ${esc(a.name)}</option>`).join(''); if ([...gs.options].some(o => o.value === v)) gs.value = v; }
  const ks = document.getElementById('asset-klass'); if (ks && !ks.options.length) ks.innerHTML = Object.entries(CLASSES_ATIVO).map(([k, c]) => `<option value="${k}">${c.icone} ${c.nome}</option>`).join('');
  const ps = document.getElementById('project-stage'); if (ps && !ps.options.length) ps.innerHTML = Object.entries(ESTAGIOS_PROJETO).map(([k, e]) => `<option value="${k}">${e[0]} ${e[1]}</option>`).join('');
}

// --- Ativos ---
document.getElementById('asset-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('asset-id').value;
  const dados = { name: document.getElementById('asset-name').value.trim(), institution: document.getElementById('asset-inst').value.trim(), klass: document.getElementById('asset-klass').value, current: parseFloat(document.getElementById('asset-current').value) || 0, currentAt: document.getElementById('asset-current-at').value || hojeISO(), due: document.getElementById('asset-due').value || '', rate: document.getElementById('asset-rate').value.trim(), notes: document.getElementById('asset-notes').value.trim() };
  if (!dados.name) return;
  if (id) { const a = assets.find(x => String(x.id) === id); if (a) Object.assign(a, dados); }
  else {
    const a = { id: novoId(), archived: false, createdAt: Date.now(), ...dados }; assets.push(a);
    // valor inicial vira o primeiro aporte (sem lançar em Finanças: já era seu)
    const inicial = parseFloat(document.getElementById('asset-initial').value) || 0;
    if (inicial > 0) moves.push({ id: novoId(), assetId: a.id, date: dados.currentAt, type: 'aporte', amount: inicial, note: 'Saldo inicial', financeId: null, initial: true });
    if (inicial > 0) salvar('moves', moves);
  }
  salvar('assets', assets); cancelarEdicaoAtivo(); redesenharNegocios();
  toast(id ? '📈 Ativo atualizado.' : '📈 Ativo adicionado.');
});
function cancelarEdicaoAtivo() { document.getElementById('asset-form').reset(); document.getElementById('asset-id').value = ''; document.getElementById('asset-current-at').value = hojeISO(); document.getElementById('asset-initial').parentElement.hidden = false; document.getElementById('asset-submit').innerText = 'Adicionar ativo'; document.getElementById('asset-cancel').hidden = true; }
function editarAtivo(id) {
  const a = assets.find(x => x.id === id); if (!a) return;
  document.getElementById('asset-id').value = a.id; document.getElementById('asset-name').value = a.name; document.getElementById('asset-inst').value = a.institution || ''; document.getElementById('asset-klass').value = a.klass || 'outro'; document.getElementById('asset-current').value = a.current || 0; document.getElementById('asset-current-at').value = a.currentAt || hojeISO(); document.getElementById('asset-due').value = a.due || ''; document.getElementById('asset-rate').value = a.rate || ''; document.getElementById('asset-notes').value = a.notes || '';
  document.getElementById('asset-initial').parentElement.hidden = true;
  document.getElementById('asset-submit').innerText = 'Salvar ativo'; document.getElementById('asset-cancel').hidden = false; document.getElementById('asset-name').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('asset-name').focus();
}
function atualizarValorAtivo(id) {
  const a = assets.find(x => x.id === id); if (!a) return;
  const v = prompt(`Valor atual de "${a.name}" (R$):`, String(a.current || 0).replace('.', ','));
  if (v === null) return; const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); if (isNaN(n)) return;
  a.current = n; a.currentAt = hojeISO(); salvar('assets', assets); redesenharNegocios(); toast(`💰 ${a.name}: ${formatCurrency(n)}`);
}
function arquivarAtivo(id) { const a = assets.find(x => x.id === id); if (!a) return; a.archived = !a.archived; salvar('assets', assets); redesenharNegocios(); }
function removerAtivo(id) {
  const a = assets.find(x => x.id === id); if (!a) return;
  const n = moves.filter(m => m.assetId === id).length;
  if (!confirm(`Apagar "${a.name}"?${n ? ` As ${n} movimentações dele também somem (os lançamentos em Finanças ficam).` : ''}`)) return;
  assets = assets.filter(x => x.id !== id); moves = moves.filter(m => m.assetId !== id); salvar('assets', assets); salvar('moves', moves); redesenharNegocios();
}
function renderAtivos() {
  const ul = document.getElementById('asset-list'); if (!ul) return; ul.innerHTML = '';
  if (!assets.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Cadastre seu primeiro ativo — ex: "CDB Nubank" (Renda fixa) ou "Reserva Tesouro Selic".</li>'; return; }
  const hoje = hojeISO();
  [...assets].sort((a, b) => (a.archived === b.archived ? (b.current || 0) - (a.current || 0) : a.archived ? 1 : -1)).forEach(a => {
    const c = classeAtivo(a.klass); const inv = investidoEm(a.id); const res = (a.current || 0) - inv; const p = inv ? res / inv * 100 : 0;
    const venc = a.due ? (a.due < hoje ? `<span class="badge-topay">venceu ${isoParaBR(a.due)}</span>` : `<span class="item-date">vence ${isoParaBR(a.due)}</span>`) : '';
    ul.innerHTML += `<li class="asset-item" style="border-left-color:${c.cor}; ${a.archived ? 'opacity:0.45' : ''}"><div class="transaction-info" style="flex:1"><span>${c.icone} ${esc(a.name)} <small class="category-badge" style="color:${c.cor}; background:${c.cor}22">${c.nome}</small>${a.institution ? ` <small class="item-date">${esc(a.institution)}</small>` : ''}${a.rate ? ` <small class="item-date">· ${esc(a.rate)}</small>` : ''} ${venc}${a.archived ? ' <small class="item-date">· arquivado</small>' : ''}</span>
        <small class="item-date">investido ${formatCurrency(inv)} · resultado <span style="color:${res >= 0 ? '#30d158' : '#ff453a'}">${formatCurrency(res)} (${pct(p)})</span> · valor de ${isoParaBR(a.currentAt || hoje)}</small>${a.notes ? `<small class="item-notes">${esc(a.notes)}</small>` : ''}</div>
      <div class="item-actions"><strong style="margin-right:6px">${formatCurrency(a.current)}</strong><button class="mini-btn" title="Atualizar valor atual" onclick="atualizarValorAtivo(${a.id})">💰</button><button class="mini-btn" title="Editar" onclick="editarAtivo(${a.id})">✎</button><button class="mini-btn" title="${a.archived ? 'Reativar' : 'Arquivar'}" onclick="arquivarAtivo(${a.id})">${a.archived ? '📤' : '🗄️'}</button><button class="mini-btn" title="Apagar" onclick="removerAtivo(${a.id})">✕</button></div></li>`;
  });
}

// --- Movimentações (aportes / resgates) ---
document.getElementById('move-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const assetId = Number(document.getElementById('move-asset').value); const a = assets.find(x => x.id === assetId); if (!a) { toast('Cadastre um ativo primeiro.'); return; }
  const type = document.getElementById('move-type').value; const amount = parseFloat(document.getElementById('move-amount').value); if (!amount || amount <= 0) return;
  const date = document.getElementById('move-date').value || hojeISO(); const note = document.getElementById('move-note').value.trim();
  const mv = { id: novoId(), assetId, date, type, amount, note, financeId: null };
  if (document.getElementById('move-finance').checked) {
    const t = { id: novoId(), date, desc: `${type === 'aporte' ? 'Aporte' : 'Resgate'}: ${a.name}`, amount, type: type === 'aporte' ? 'expense' : 'income', category: 'Investimentos', notes: note, pending: false, investId: mv.id };
    transactions.push(t); mv.financeId = t.id; salvar('finances', transactions); updateFinanceValues(); renderFinances();
  }
  moves.push(mv);
  if (document.getElementById('move-update').checked) { a.current = Math.max(0, (Number(a.current) || 0) + (type === 'aporte' ? amount : -amount)); a.currentAt = date; salvar('assets', assets); }
  salvar('moves', moves); document.getElementById('move-form').reset(); document.getElementById('move-date').value = hojeISO(); document.getElementById('move-finance').checked = true; document.getElementById('move-update').checked = true;
  redesenharNegocios(); renderJournal(); toast(`${type === 'aporte' ? '📥 Aporte' : '📤 Resgate'} de ${formatCurrency(amount)} em ${a.name}.`);
});
function removerMovimento(id) {
  const m = moves.find(x => x.id === id); if (!m || !confirm('Apagar esta movimentação?' + (m.financeId ? ' O lançamento em Finanças também será apagado.' : ''))) return;
  moves = moves.filter(x => x.id !== id); salvar('moves', moves);
  if (m.financeId) { transactions = transactions.filter(t => t.id !== m.financeId); salvar('finances', transactions); updateFinanceValues(); renderFinances(); }
  redesenharNegocios(); renderJournal();
}
function renderMovimentos() {
  const ul = document.getElementById('move-list'); if (!ul) return; ul.innerHTML = '';
  const lista = [...moves].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 20);
  if (!lista.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhuma movimentação ainda.</li>'; return; }
  lista.forEach(m => {
    const ap = m.type === 'aporte';
    ul.innerHTML += `<li class="${ap ? 'expense-item' : 'income-item'}"><div class="transaction-info" style="flex:1"><span>${ap ? '📥 Aporte' : '📤 Resgate'} · ${esc(ativoNome(m.assetId))}${m.financeId ? ' <small class="item-date">· em Finanças</small>' : ''}</span><small class="item-date">${isoParaBR(m.date)}${m.note ? ' · ' + esc(m.note) : ''}</small></div>
      <div class="item-actions"><strong style="margin-right:6px; color:${ap ? '#0a84ff' : '#ff9f0a'}">${ap ? '+' : '−'}${formatCurrency(m.amount)}</strong><button class="mini-btn" title="Apagar" onclick="removerMovimento(${m.id})">✕</button></div></li>`;
  });
}

// --- Metas ---
function valorMeta(g) { if (g.linkedTo === 'total') return patrimonioTotal(); if (g.linkedTo === 'reserva') return totalClasse('reserva'); const a = assets.find(x => x.id === Number(g.linkedTo)); return a ? (Number(a.current) || 0) : 0; }
function rotuloVinculo(g) { if (g.linkedTo === 'total') return 'patrimônio total'; if (g.linkedTo === 'reserva') return 'reserva de emergência'; return ativoNome(Number(g.linkedTo)); }
document.getElementById('goal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('goal-id').value;
  const dados = { name: document.getElementById('goal-name').value.trim(), target: parseFloat(document.getElementById('goal-target').value) || 0, deadline: document.getElementById('goal-deadline').value || '', linkedTo: document.getElementById('goal-link').value, note: document.getElementById('goal-note').value.trim() };
  if (!dados.name || !dados.target) return;
  if (id) { const g = goals.find(x => String(x.id) === id); if (g) Object.assign(g, dados); } else goals.push({ id: novoId(), createdAt: Date.now(), ...dados });
  salvar('goals', goals); cancelarEdicaoMeta(); redesenharNegocios(); toast(id ? '🎯 Meta atualizada.' : '🎯 Meta criada.');
});
function cancelarEdicaoMeta() { document.getElementById('goal-form').reset(); document.getElementById('goal-id').value = ''; document.getElementById('goal-submit').innerText = 'Adicionar meta'; document.getElementById('goal-cancel').hidden = true; }
function editarMeta(id) { const g = goals.find(x => x.id === id); if (!g) return; document.getElementById('goal-id').value = g.id; document.getElementById('goal-name').value = g.name; document.getElementById('goal-target').value = g.target; document.getElementById('goal-deadline').value = g.deadline || ''; document.getElementById('goal-link').value = g.linkedTo; document.getElementById('goal-note').value = g.note || ''; document.getElementById('goal-submit').innerText = 'Salvar meta'; document.getElementById('goal-cancel').hidden = false; document.getElementById('goal-name').focus(); }
function removerMeta(id) { const g = goals.find(x => x.id === id); if (!g || !confirm(`Apagar a meta "${g.name}"?`)) return; goals = goals.filter(x => x.id !== id); salvar('goals', goals); redesenharNegocios(); }
function renderMetas() {
  const ul = document.getElementById('goal-list'); if (!ul) return; ul.innerHTML = '';
  if (!goals.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Ex: "Reserva de 6 meses" (R$ 30.000, vinculada à reserva) ou "Capital pra clínica".</li>'; return; }
  goals.forEach(g => {
    const atual = valorMeta(g); const p = g.target ? Math.min(100, Math.round(atual / g.target * 100)) : 0; const falta = Math.max(0, g.target - atual);
    let porMes = '';
    if (g.deadline && falta > 0) { const [y, m, d] = g.deadline.split('-').map(Number); const meses = Math.max(1, Math.round((new Date(y, m - 1, d) - new Date()) / (30.44 * 86400000))); porMes = ` · ${formatCurrency(falta / meses)}/mês por ${meses} ${meses === 1 ? 'mês' : 'meses'}`; }
    ul.innerHTML += `<li class="goal-item" style="border-left-color:${p >= 100 ? '#30d158' : '#ffd60a'}"><div class="transaction-info" style="flex:1"><span>🎯 ${esc(g.name)} ${p >= 100 ? '<span class="badge-paid">alcançada</span>' : ''}<small class="item-date"> · ${rotuloVinculo(g)}${g.deadline ? ' · até ' + isoParaBR(g.deadline) : ''}</small></span>
        <div class="cat-bar" style="margin-top:6px"><div style="width:${p}%; background:${p >= 100 ? '#30d158' : '#ffd60a'}"></div></div>
        <small class="item-date">${formatCurrency(atual)} de ${formatCurrency(g.target)} (${p}%)${falta > 0 ? ` · faltam ${formatCurrency(falta)}${porMes}` : ''}</small>${g.note ? `<small class="item-notes">${esc(g.note)}</small>` : ''}</div>
      <div class="item-actions"><button class="mini-btn" title="Editar" onclick="editarMeta(${g.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerMeta(${g.id})">✕</button></div></li>`;
  });
}

// --- Projetos de negócio ---
document.getElementById('project-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('project-id').value;
  const linhas = document.getElementById('project-steps').value.split('\n').map(s => s.trim()).filter(Boolean);
  const dados = { name: document.getElementById('project-name').value.trim(), stage: document.getElementById('project-stage').value, desc: document.getElementById('project-desc').value.trim(), budget: parseFloat(document.getElementById('project-budget').value) || 0, spent: parseFloat(document.getElementById('project-spent').value) || 0, contacts: document.getElementById('project-contacts').value.trim(), notes: document.getElementById('project-notes').value.trim(), updatedAt: Date.now() };
  if (!dados.name) return;
  if (id) { const p = projects.find(x => String(x.id) === id); if (!p) return; const antigas = p.steps || []; Object.assign(p, dados); p.steps = linhas.map(l => ({ text: l, done: !!(antigas.find(s => s.text === l) || {}).done })); }
  else projects.push({ id: novoId(), createdAt: Date.now(), steps: linhas.map(l => ({ text: l, done: false })), ...dados });
  salvar('projects', projects); cancelarEdicaoProjeto(); redesenharNegocios(); toast(id ? '🚀 Projeto atualizado.' : '🚀 Projeto criado.');
});
function cancelarEdicaoProjeto() { document.getElementById('project-form').reset(); document.getElementById('project-id').value = ''; document.getElementById('project-submit').innerText = 'Adicionar projeto'; document.getElementById('project-cancel').hidden = true; }
function editarProjeto(id) {
  const p = projects.find(x => x.id === id); if (!p) return;
  document.getElementById('project-id').value = p.id; document.getElementById('project-name').value = p.name; document.getElementById('project-stage').value = p.stage || 'ideia'; document.getElementById('project-desc').value = p.desc || ''; document.getElementById('project-steps').value = (p.steps || []).map(s => s.text).join('\n'); document.getElementById('project-budget').value = p.budget || ''; document.getElementById('project-spent').value = p.spent || ''; document.getElementById('project-contacts').value = p.contacts || ''; document.getElementById('project-notes').value = p.notes || '';
  document.getElementById('project-submit').innerText = 'Salvar projeto'; document.getElementById('project-cancel').hidden = false; document.getElementById('project-name').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('project-name').focus();
}
function mudarEstagio(id, stage) { const p = projects.find(x => x.id === id); if (!p) return; p.stage = stage; p.updatedAt = Date.now(); salvar('projects', projects); redesenharNegocios(); }
function togglePasso(id, i) { const p = projects.find(x => x.id === id); if (!p || !p.steps[i]) return; p.steps[i].done = !p.steps[i].done; p.updatedAt = Date.now(); salvar('projects', projects); renderProjetos(); }
function removerProjeto(id) { const p = projects.find(x => x.id === id); if (!p || !confirm(`Apagar o projeto "${p.name}"?`)) return; projects = projects.filter(x => x.id !== id); salvar('projects', projects); redesenharNegocios(); }
function filtrarProjetos(f, el) { projectFilter = f; document.querySelectorAll('#project-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderProjetos(); }
function renderProjetos() {
  const el = document.getElementById('project-list'); if (!el) return; el.innerHTML = '';
  let lista = [...projects]; if (projectFilter === 'ativos') lista = lista.filter(p => !['pausado', 'encerrado'].includes(p.stage));
  lista.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!lista.length) { el.innerHTML = '<div class="stat-line muted" style="text-align:center; padding:16px;">Nenhum projeto aqui. Ex: "Clínica popular", "Telemedicina", "Curso online".</div>'; return; }
  el.innerHTML = '<div class="note-grid">' + lista.map(p => {
    const e = ESTAGIOS_PROJETO[p.stage] || ESTAGIOS_PROJETO.ideia; const feitos = (p.steps || []).filter(s => s.done).length; const tot = (p.steps || []).length;
    const gastoPct = p.budget ? Math.min(100, Math.round((p.spent || 0) / p.budget * 100)) : 0;
    return `<div class="note-card project-card" style="border-color:${e[2]}">
      <div class="note-header"><h4>${e[0]} ${esc(p.name)}</h4><div class="item-actions"><button class="mini-btn" title="Editar" onclick="editarProjeto(${p.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerProjeto(${p.id})">✕</button></div></div>
      <select class="stage-select" style="color:${e[2]}" onchange="mudarEstagio(${p.id}, this.value)">${Object.entries(ESTAGIOS_PROJETO).map(([k, v]) => `<option value="${k}" ${k === p.stage ? 'selected' : ''}>${v[0]} ${v[1]}</option>`).join('')}</select>
      ${p.desc ? `<div class="note-body">${esc(p.desc)}</div>` : ''}
      ${tot ? `<div class="note-check"><small class="item-date">Próximos passos · ${feitos}/${tot}</small>${p.steps.map((s, i) => `<label class="subtask ${s.done ? 'done' : ''}"><input type="checkbox" ${s.done ? 'checked' : ''} onclick="togglePasso(${p.id}, ${i})"> ${esc(s.text)}</label>`).join('')}</div>` : ''}
      ${p.budget || p.spent ? `<div><small class="item-date">💸 gasto ${formatCurrency(p.spent || 0)}${p.budget ? ` de ${formatCurrency(p.budget)} previstos (${gastoPct}%)` : ''}</small><div class="cat-bar" style="margin-top:4px"><div style="width:${gastoPct}%; background:${gastoPct > 100 ? '#ff453a' : '#ff9f0a'}"></div></div></div>` : ''}
      ${p.contacts ? `<small class="item-notes">👥 ${esc(p.contacts)}</small>` : ''}${p.notes ? `<small class="item-notes">${esc(p.notes)}</small>` : ''}
      <div class="note-foot"><small class="item-date" style="margin-left:auto">${new Date(p.updatedAt || p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</small></div>
    </div>`;
  }).join('') + '</div>';
}

// --- Indicadores de referência (manuais) e evolução mensal ---
function salvarIndicadores() {
  wealth.indicators = { cdi: parseFloat(document.getElementById('ind-cdi').value) || 0, selic: parseFloat(document.getElementById('ind-selic').value) || 0, ipca: parseFloat(document.getElementById('ind-ipca').value) || 0, ref: document.getElementById('ind-ref').value.trim() };
  salvar('wealth', wealth); renderPainelNegocios(); toast('📊 Indicadores salvos.');
}
function registrarSnapshot() {
  const m = hojeISO().slice(0, 7); const total = patrimonioTotal();
  if (!wealth.snapshots) wealth.snapshots = {};
  if (wealth.snapshots[m] !== total && (assets.length || wealth.snapshots[m] !== undefined)) { wealth.snapshots[m] = total; salvar('wealth', wealth); }
}
function renderPainelNegocios() {
  const el = document.getElementById('biz-dash'); if (!el) return;
  registrarSnapshot();
  const total = patrimonioTotal(); const inv = investidoTotal(); const res = total - inv; const p = inv ? res / inv * 100 : 0; const reserva = totalClasse('reserva');
  const mes = hojeISO().slice(0, 7); const aportadoMes = moves.filter(m => m.type === 'aporte' && !m.initial && m.date.startsWith(mes)).reduce((a, m) => a + m.amount, 0);
  const tile = (icone, valor, rotulo, cor) => `<div class="stat-tile"><span class="stat-icon">${icone}</span><strong style="color:${cor}">${valor}</strong><small>${rotulo}</small></div>`;
  let html = '<div class="stat-grid">';
  html += tile('🏦', formatCurrency(total), 'patrimônio investido (valor atual)', '#0a84ff');
  html += tile('📥', formatCurrency(inv), `aportado no total · ${formatCurrency(aportadoMes)} neste mês`, '#bf5af2');
  html += tile('📈', formatCurrency(res), `resultado simples (${pct(p)})`, res >= 0 ? '#30d158' : '#ff453a');
  html += tile('🛟', formatCurrency(reserva), 'reserva de emergência', '#30d158');
  html += '</div>';
  // por classe
  const classes = Object.keys(CLASSES_ATIVO).map(k => ({ k, v: totalClasse(k) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (classes.length) html += '<div class="cat-block" style="margin-top:14px"><h5>Por classe</h5>' + classes.map(({ k, v }) => { const c = classeAtivo(k); return `<div class="cat-row"><span class="cat-name">${c.icone} ${c.nome}</span><div class="cat-bar"><div style="width:${Math.round(v / total * 100)}%; background:${c.cor}"></div></div><span class="cat-val">${formatCurrency(v)} <small>${Math.round(v / total * 100)}%</small></span></div>`; }).join('') + '</div>';
  // evolução mensal (últimos 6 meses com registro)
  const snaps = Object.entries(wealth.snapshots || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  if (snaps.length >= 2) { const max = Math.max(1, ...snaps.map(s => s[1])); html += '<div class="cat-block"><h5>Evolução do patrimônio</h5><div class="fin-meses" style="height:120px">' + snaps.map(([m, v]) => `<div class="mes-col" title="${formatCurrency(v)}"><div class="mes-bars" style="height:70px"><div class="mes-bar" style="width:60%; height:${Math.round(v / max * 100)}%; background:#0a84ff"></div></div><small>${nomeMes(m).slice(0, 3)}</small><small class="mes-saldo" style="color:#8e8e93">${(v / 1000).toFixed(1)}k</small></div>`).join('') + '</div></div>'; }
  // vencimentos próximos (60 dias)
  const lim = new Date(); lim.setDate(lim.getDate() + 60); const limISO = isoDe(lim); const hoje = hojeISO();
  const venc = assets.filter(a => !a.archived && a.due && a.due <= limISO).sort((a, b) => a.due.localeCompare(b.due));
  if (venc.length) html += '<div class="cat-block"><h5>⏰ Vencimentos nos próximos 60 dias</h5>' + venc.map(a => `<div class="stat-line ${a.due < hoje ? 'muted' : ''}"><strong>${isoParaBR(a.due)}</strong> · ${esc(a.name)} · ${formatCurrency(a.current)}${a.due < hoje ? ' (vencido)' : ''}</div>`).join('') + '</div>';
  // indicadores
  const ind = wealth.indicators || {};
  html += `<div class="ind-row"><span>📊 Referência${ind.ref ? ' (' + esc(ind.ref) + ')' : ''}:</span> <span>CDI <strong>${ind.cdi ? ind.cdi.toString().replace('.', ',') + '%' : '—'}</strong></span> <span>Selic <strong>${ind.selic ? ind.selic.toString().replace('.', ',') + '%' : '—'}</strong></span> <span>IPCA <strong>${ind.ipca ? ind.ipca.toString().replace('.', ',') + '%' : '—'}</strong></span> <span class="item-date">· a.a., anotados por você</span></div>`;
  el.innerHTML = html;
  ['cdi', 'selic', 'ipca'].forEach(k => { const i = document.getElementById('ind-' + k); if (i && document.activeElement !== i) i.value = ind[k] || ''; }); const r = document.getElementById('ind-ref'); if (r && document.activeElement !== r) r.value = ind.ref || '';
}
function redesenharNegocios() { preencherSelectsNegocios(); renderPainelNegocios(); renderAtivos(); renderMovimentos(); renderMetas(); renderProjetos(); }

// ============================================================================
// SAÚDE (módulo J)
// workouts:  [{ id, date, type, minutes, intensity, exercises: [texto], note }]
// measures:  [{ id, date, weight, waist, bodyfat, note }]
// hydration: { date: 'dd/mm/aaaa', ml, goal, dias: { 'aaaa-mm-dd': ml } }
// meals:     [{ id, date, time, type, desc, quality }]
// medical:   [{ id, kind, title, date, place, notes, done, eventId }]  (consultas, exames, vacinas, medicamentos)
// ============================================================================
const TIPOS_TREINO = { musculacao: ['🏋️', 'Musculação'], corrida: ['🏃', 'Corrida'], caminhada: ['🚶', 'Caminhada'], bike: ['🚴', 'Bike'], natacao: ['🏊', 'Natação'], funcional: ['🤸', 'Funcional / Crossfit'], futebol: ['⚽', 'Futebol / Esporte'], alongamento: ['🧘', 'Alongamento / Yoga'], outro: ['💪', 'Outro'] };
const TIPOS_REFEICAO = { cafe: ['☕', 'Café da manhã'], almoco: ['🍽️', 'Almoço'], lanche: ['🍎', 'Lanche'], jantar: ['🍲', 'Jantar'], ceia: ['🌙', 'Ceia'] };
const QUALIDADE_REFEICAO = { boa: ['🟢', 'Boa'], ok: ['🟡', 'Ok'], ruim: ['🔴', 'Ruim'] };
const TIPOS_MEDICO = { consulta: ['🩺', 'Consulta'], exame: ['🧪', 'Exame'], vacina: ['💉', 'Vacina'], medicamento: ['💊', 'Medicamento'], outro: ['📌', 'Outro'] };

function marcarHabitoPorNome(regex) {
  const idx = habits.findIndex(h => regex.test(h.text));
  if (idx >= 0 && !habits[idx].done) { habits[idx].done = true; salvar('habits', habits); renderFocusTab(); renderJournal(); atualizarSaudacao(); return true; }
  return false;
}

// --- Água ---
function verificarNovoDiaAgua() {
  const hoje = hojeBR();
  if (!hydration.dias) hydration.dias = {};
  if (hydration.date !== hoje) {
    if (hydration.ml > 0) hydration.dias[brParaISO(hydration.date)] = hydration.ml;
    hydration.date = hoje; hydration.ml = 0; salvar('hydration', hydration);
  }
}
function beberAgua(ml) {
  verificarNovoDiaAgua();
  hydration.ml = Math.max(0, (hydration.ml || 0) + ml); salvar('hydration', hydration);
  if (hydration.ml >= (hydration.goal || 2500) && marcarHabitoPorNome(/[áa]gua/i)) toast('💧 Meta de água batida — hábito marcado!');
  renderSaude(); renderHabitosRapidos();
}
function definirMetaAgua() {
  const v = prompt('Meta diária de água (ml):', String(hydration.goal || 2500)); if (v === null) return;
  const n = parseInt(v); if (!n || n < 200) return; hydration.goal = n; salvar('hydration', hydration); renderSaude();
}

// --- Treinos ---
document.getElementById('workout-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('workout-id').value;
  const dados = { date: document.getElementById('workout-date').value || hojeISO(), type: document.getElementById('workout-type').value, minutes: parseInt(document.getElementById('workout-minutes').value) || 0, intensity: parseInt(document.getElementById('workout-intensity').value) || 2, exercises: document.getElementById('workout-exercises').value.split('\n').map(s => s.trim()).filter(Boolean), note: document.getElementById('workout-note').value.trim() };
  if (id) { const w = workouts.find(x => String(x.id) === id); if (w) Object.assign(w, dados); } else workouts.push({ id: novoId(), createdAt: Date.now(), ...dados });
  salvar('workouts', workouts); cancelarEdicaoTreino();
  if (dados.date === hojeISO() && marcarHabitoPorNome(/trein|academia|workout|exerc/i)) toast('🏋️ Treino registrado — hábito marcado!'); else toast('🏋️ Treino registrado.');
  renderSaude(); renderJournal();
});
function cancelarEdicaoTreino() { document.getElementById('workout-form').reset(); document.getElementById('workout-id').value = ''; document.getElementById('workout-date').value = hojeISO(); document.getElementById('workout-submit').innerText = 'Registrar treino'; document.getElementById('workout-cancel').hidden = true; }
function editarTreino(id) {
  const w = workouts.find(x => x.id === id); if (!w) return;
  document.getElementById('workout-id').value = w.id; document.getElementById('workout-date').value = w.date; document.getElementById('workout-type').value = w.type; document.getElementById('workout-minutes').value = w.minutes || ''; document.getElementById('workout-intensity').value = w.intensity || 2; document.getElementById('workout-exercises').value = (w.exercises || []).join('\n'); document.getElementById('workout-note').value = w.note || '';
  document.getElementById('workout-submit').innerText = 'Salvar treino'; document.getElementById('workout-cancel').hidden = false; document.getElementById('workout-date').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function repetirTreino(id) { const w = workouts.find(x => x.id === id); if (!w) return; editarTreino(w.id); document.getElementById('workout-id').value = ''; document.getElementById('workout-date').value = hojeISO(); document.getElementById('workout-submit').innerText = 'Registrar treino'; document.getElementById('workout-cancel').hidden = true; toast('Treino copiado — ajuste e registre.'); }
function removerTreino(id) { const w = workouts.find(x => x.id === id); if (!w || !confirm('Apagar este treino?')) return; workouts = workouts.filter(x => x.id !== id); salvar('workouts', workouts); renderSaude(); renderJournal(); }
function renderTreinos() {
  const ul = document.getElementById('workout-list'); if (!ul) return; ul.innerHTML = '';
  const lista = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 20);
  if (!lista.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhum treino ainda.</li>'; return; }
  lista.forEach(w => {
    const t = TIPOS_TREINO[w.type] || TIPOS_TREINO.outro;
    ul.innerHTML += `<li class="health-item"><div class="transaction-info" style="flex:1"><span>${t[0]} ${t[1]} <small class="item-date">${rotuloData(w.date)} · ${isoParaBR(w.date)}${w.minutes ? ' · ' + w.minutes + ' min' : ''} · ${'🔥'.repeat(w.intensity || 2)}</small></span>${(w.exercises || []).length ? `<small class="item-notes">${w.exercises.map(esc).join(' · ')}</small>` : ''}${w.note ? `<small class="item-notes">${esc(w.note)}</small>` : ''}</div>
      <div class="item-actions"><button class="mini-btn" title="Repetir hoje" onclick="repetirTreino(${w.id})">↻</button><button class="mini-btn" title="Editar" onclick="editarTreino(${w.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerTreino(${w.id})">✕</button></div></li>`;
  });
}

// --- Peso e medidas ---
document.getElementById('measure-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const dados = { date: document.getElementById('measure-date').value || hojeISO(), weight: parseFloat(document.getElementById('measure-weight').value) || 0, waist: parseFloat(document.getElementById('measure-waist').value) || 0, bodyfat: parseFloat(document.getElementById('measure-fat').value) || 0, note: document.getElementById('measure-note').value.trim() };
  if (!dados.weight && !dados.waist && !dados.bodyfat) return;
  measures.push({ id: novoId(), ...dados }); salvar('measures', measures);
  document.getElementById('measure-form').reset(); document.getElementById('measure-date').value = hojeISO(); renderSaude(); toast('⚖️ Medida registrada.');
});
function removerMedida(id) { if (!confirm('Apagar esta medida?')) return; measures = measures.filter(x => x.id !== id); salvar('measures', measures); renderSaude(); }
function renderMedidas() {
  const ul = document.getElementById('measure-list'); const ch = document.getElementById('weight-chart'); if (!ul) return; ul.innerHTML = '';
  const lista = [...measures].sort((a, b) => a.date.localeCompare(b.date));
  const pesos = lista.filter(m => m.weight > 0).slice(-12);
  if (ch) {
    if (pesos.length >= 2) { const min = Math.min(...pesos.map(m => m.weight)) - 1; const max = Math.max(...pesos.map(m => m.weight)) + 1; ch.innerHTML = '<div class="fin-meses" style="grid-template-columns:repeat(' + pesos.length + ',1fr); height:130px">' + pesos.map(m => `<div class="mes-col" title="${isoParaBR(m.date)}: ${m.weight} kg"><div class="mes-bars" style="height:80px"><div class="mes-bar" style="width:60%; height:${Math.round((m.weight - min) / (max - min) * 100)}%; background:#ff375f"></div></div><small>${isoParaBR(m.date).slice(0, 5)}</small><small class="mes-saldo" style="color:#f5f5f7">${m.weight}</small></div>`).join('') + '</div>'; }
    else ch.innerHTML = '<div class="stat-line muted">Registre pelo menos 2 pesagens pra ver a evolução.</div>';
  }
  if (!lista.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Nenhuma medida ainda.</li>'; return; }
  [...lista].reverse().slice(0, 10).forEach(m => {
    ul.innerHTML += `<li class="health-item"><div class="transaction-info" style="flex:1"><span>${m.weight ? `<strong>${m.weight} kg</strong>` : ''}${m.waist ? ` · cintura ${m.waist} cm` : ''}${m.bodyfat ? ` · ${m.bodyfat}% gordura` : ''}</span><small class="item-date">${isoParaBR(m.date)}${m.note ? ' · ' + esc(m.note) : ''}</small></div><div class="item-actions"><button class="mini-btn" title="Apagar" onclick="removerMedida(${m.id})">✕</button></div></li>`;
  });
}

// --- Refeições ---
document.getElementById('meal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const desc = document.getElementById('meal-desc').value.trim(); if (!desc) return;
  meals.push({ id: novoId(), date: document.getElementById('meal-date').value || hojeISO(), time: document.getElementById('meal-time').value, type: document.getElementById('meal-type').value, desc, quality: document.getElementById('meal-quality').value });
  salvar('meals', meals); document.getElementById('meal-form').reset(); document.getElementById('meal-date').value = hojeISO(); renderSaude(); toast('🍽️ Refeição anotada.');
});
function removerRefeicao(id) { meals = meals.filter(x => x.id !== id); salvar('meals', meals); renderSaude(); }
function renderRefeicoes() {
  const ul = document.getElementById('meal-list'); if (!ul) return; ul.innerHTML = '';
  const lista = [...meals].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 15);
  if (!lista.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Diário simples: o que comeu e se foi boa, ok ou ruim. Sem calorias, sem culpa.</li>'; return; }
  let ultima = '';
  lista.forEach(m => {
    if (m.date !== ultima) { ultima = m.date; const doDia = meals.filter(x => x.date === m.date); const boas = doDia.filter(x => x.quality === 'boa').length; ul.innerHTML += `<li class="date-sep">${rotuloData(m.date)} <small>${isoParaBR(m.date)} · ${boas}/${doDia.length} boas</small></li>`; }
    const t = TIPOS_REFEICAO[m.type] || ['🍽️', '']; const q = QUALIDADE_REFEICAO[m.quality] || ['', ''];
    ul.innerHTML += `<li class="health-item"><div class="transaction-info" style="flex:1"><span>${t[0]} <strong>${esc(m.time || '')}</strong> ${esc(m.desc)} <small class="item-date">${q[0]} ${q[1]}</small></span></div><div class="item-actions"><button class="mini-btn" title="Apagar" onclick="removerRefeicao(${m.id})">✕</button></div></li>`;
  });
}

// --- Consultas, exames, vacinas, medicamentos (viram compromisso tipo Saúde na agenda) ---
function sincronizarEventoMedico(m) {
  let ev = m.eventId ? events.find(e => e.id === m.eventId) : null;
  const k = TIPOS_MEDICO[m.kind] || TIPOS_MEDICO.outro;
  if (!m.date || m.done) { if (ev) { events = events.filter(e => e.id !== ev.id); m.eventId = null; salvar('events', events); } return; }
  if (!ev) { ev = { id: novoId(), type: 'saude', done: false, medicalId: m.id }; events.push(ev); m.eventId = ev.id; }
  ev.title = `${k[1]}: ${m.title}`; ev.date = m.date; ev.time = m.time || ''; ev.endTime = ''; ev.notes = [m.place, m.notes].filter(Boolean).join(' · ');
  salvar('events', events);
}
document.getElementById('medical-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('medical-id').value;
  const dados = { kind: document.getElementById('medical-kind').value, title: document.getElementById('medical-title').value.trim(), date: document.getElementById('medical-date').value || '', time: document.getElementById('medical-time').value, place: document.getElementById('medical-place').value.trim(), notes: document.getElementById('medical-notes').value.trim() };
  if (!dados.title) return;
  let m; if (id) { m = medical.find(x => String(x.id) === id); if (!m) return; Object.assign(m, dados); } else { m = { id: novoId(), done: false, eventId: null, createdAt: Date.now(), ...dados }; medical.push(m); }
  sincronizarEventoMedico(m); salvar('medical', medical); cancelarEdicaoMedico(); renderSaude(); redesenharAgenda(); toast(id ? '🩺 Atualizado.' : '🩺 Registrado' + (dados.date ? ' — já está no calendário.' : '.'));
});
function cancelarEdicaoMedico() { document.getElementById('medical-form').reset(); document.getElementById('medical-id').value = ''; document.getElementById('medical-submit').innerText = 'Adicionar'; document.getElementById('medical-cancel').hidden = true; }
function editarMedico(id) {
  const m = medical.find(x => x.id === id); if (!m) return;
  document.getElementById('medical-id').value = m.id; document.getElementById('medical-kind').value = m.kind; document.getElementById('medical-title').value = m.title; document.getElementById('medical-date').value = m.date || ''; document.getElementById('medical-time').value = m.time || ''; document.getElementById('medical-place').value = m.place || ''; document.getElementById('medical-notes').value = m.notes || '';
  document.getElementById('medical-submit').innerText = 'Salvar'; document.getElementById('medical-cancel').hidden = false; document.getElementById('medical-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function concluirMedico(id) { const m = medical.find(x => x.id === id); if (!m) return; m.done = !m.done; if (m.done) m.doneAt = hojeISO(); sincronizarEventoMedico(m); salvar('medical', medical); renderSaude(); redesenharAgenda(); }
function removerMedico(id) { const m = medical.find(x => x.id === id); if (!m || !confirm(`Apagar "${m.title}"?`)) return; if (m.eventId) { events = events.filter(e => e.id !== m.eventId); salvar('events', events); } medical = medical.filter(x => x.id !== id); salvar('medical', medical); renderSaude(); redesenharAgenda(); }
function renderMedico() {
  const ul = document.getElementById('medical-list'); if (!ul) return; ul.innerHTML = '';
  const hoje = hojeISO();
  const abertos = medical.filter(m => !m.done).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const feitos = medical.filter(m => m.done).sort((a, b) => (b.doneAt || b.date || '').localeCompare(a.doneAt || a.date || '')).slice(0, 8);
  if (!medical.length) { ul.innerHTML = '<li style="justify-content:center; color:#8e8e93; background:transparent; border:none;">Seus próprios cuidados: consulta, exame, vacina, remédio. Com data, vira compromisso 🩺 no calendário.</li>'; return; }
  const linha = m => { const k = TIPOS_MEDICO[m.kind] || TIPOS_MEDICO.outro; const atras = m.date && m.date < hoje && !m.done; return `<li class="health-item" style="${m.done ? 'opacity:0.5' : ''}"><div class="transaction-info" style="flex:1"><span>${k[0]} ${esc(m.title)} <small class="item-date">${k[1]}${m.date ? ' · ' + rotuloData(m.date) + (m.time ? ' ' + esc(m.time) : '') : ' · sem data'}${atras ? ' <span class="badge-topay">passou</span>' : ''}</small></span>${m.place || m.notes ? `<small class="item-notes">${esc([m.place, m.notes].filter(Boolean).join(' · '))}</small>` : ''}</div><div class="item-actions"><button class="mini-btn ${m.done ? 'on' : ''}" title="${m.done ? 'Reabrir' : 'Concluído'}" onclick="concluirMedico(${m.id})">${m.done ? '↩' : '✓'}</button><button class="mini-btn" title="Editar" onclick="editarMedico(${m.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerMedico(${m.id})">✕</button></div></li>`; };
  abertos.forEach(m => ul.innerHTML += linha(m));
  if (feitos.length) { ul.innerHTML += `<li class="date-sep">Concluídos <small>${medical.filter(m => m.done).length}</small></li>`; feitos.forEach(m => ul.innerHTML += linha(m)); }
}

// --- Painel do módulo ---
function renderPainelSaude() {
  const el = document.getElementById('health-dash'); if (!el) return;
  verificarNovoDiaAgua();
  const ini = inicioSemanaISO(); const fim = new Date(); fim.setDate(fim.getDate() + (6 - fim.getDay())); const fimISO = isoDe(fim);
  const semana = workouts.filter(w => w.date >= ini && w.date <= fimISO); const minSemana = semana.reduce((a, w) => a + (w.minutes || 0), 0);
  const pesos = [...measures].filter(m => m.weight > 0).sort((a, b) => a.date.localeCompare(b.date)); const ultimo = pesos[pesos.length - 1]; const anterior = pesos[pesos.length - 2];
  const delta = ultimo && anterior ? (ultimo.weight - anterior.weight) : 0;
  const prox = medical.filter(m => !m.done && m.date && m.date >= hojeISO()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const goal = hydration.goal || 2500; const pct = Math.min(100, Math.round((hydration.ml || 0) / goal * 100));
  const tile = (icone, valor, rotulo, cor) => `<div class="stat-tile"><span class="stat-icon">${icone}</span><strong style="color:${cor}">${valor}</strong><small>${rotulo}</small></div>`;
  let html = '<div class="stat-grid">';
  html += tile('🏋️', `${semana.length}`, `treino${semana.length === 1 ? '' : 's'} nesta semana · ${minSemana} min`, '#30d158');
  html += tile('💧', `${((hydration.ml || 0) / 1000).toFixed(1).replace('.', ',')} L`, `de ${(goal / 1000).toFixed(1).replace('.', ',')} L hoje (${pct}%)`, '#0a84ff');
  html += tile('⚖️', ultimo ? `${ultimo.weight} kg` : '—', ultimo ? `${isoParaBR(ultimo.date)}${anterior ? ` · ${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} kg` : ''}` : 'sem pesagem', '#ff375f');
  html += tile('🩺', prox ? rotuloData(prox.date) : '—', prox ? `${(TIPOS_MEDICO[prox.kind] || TIPOS_MEDICO.outro)[1]}: ${esc(prox.title).slice(0, 28)}` : 'nada marcado', '#bf5af2');
  html += '</div>';
  html += `<div class="water-box"><div class="water-bar"><div style="width:${pct}%"></div></div><div class="water-btns"><button class="mini-btn" onclick="beberAgua(250)">+250 ml</button><button class="mini-btn" onclick="beberAgua(500)">+500 ml</button><button class="mini-btn" onclick="beberAgua(750)">+750 ml</button><button class="mini-btn" onclick="beberAgua(-250)" title="Tirar 250 ml">−250</button><button class="mini-btn" onclick="definirMetaAgua()" title="Mudar meta">🎯 meta</button></div></div>`;
  el.innerHTML = html;
}
function preencherSelectsSaude() {
  const f = (id, obj) => { const s = document.getElementById(id); if (s && !s.options.length) s.innerHTML = Object.entries(obj).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join(''); };
  f('workout-type', TIPOS_TREINO); f('meal-type', TIPOS_REFEICAO); f('meal-quality', QUALIDADE_REFEICAO); f('medical-kind', TIPOS_MEDICO);
}
function renderSaude() { preencherSelectsSaude(); renderPainelSaude(); renderTreinos(); renderMedidas(); renderRefeicoes(); renderMedico(); }

// ============================================================================
// VOZ — duas bolinhas flutuantes em todas as páginas
// 🎤 Ditado: você fala ("novo pedido do João, 3 vasos, 120 reais, entrega sexta"),
//    o app entende, mostra o que vai criar e preenche o formulário da aba certa
//    (o salvamento passa pelo próprio formulário, então segue todas as regras do app).
// ✳ Claude: você fala uma MUDANÇA NO APP; o pedido fica guardado em "clauderequests".
//    (Etapa 2: enviar esses pedidos ao Claude na nuvem, com aprovação antes de publicar.)
// Reconhecimento de voz: o do próprio navegador (Safari usa o ditado da Apple).
// Se não estiver disponível, a caixa de texto abre e você usa o 🎤 do teclado.
// ============================================================================
let vozModo = 'dados';        // 'dados' | 'claude'
let vozReconhecedor = null;
let vozGravando = false;
let vozResultado = null;      // última interpretação do ditado

const NUM_PALAVRAS = { um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900, mil: 1000 };
const DIAS_SEMANA_VOZ = { domingo: 0, segunda: 1, 'terça': 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, 'sábado': 6, sabado: 6 };
const MESES_NOME = { janeiro: 1, fevereiro: 2, 'março': 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const CORES_FILAMENTO = ['preto', 'preta', 'branco', 'branca', 'vermelho', 'vermelha', 'azul', 'verde', 'amarelo', 'amarela', 'cinza', 'laranja', 'rosa', 'roxo', 'roxa', 'dourado', 'dourada', 'prata', 'prateado', 'transparente', 'marrom', 'bege', 'lilás', 'vinho'];

function abaAtual() { const el = document.querySelector('.tab-content.active'); return el ? el.id : 'focus'; }
function nomeAbaAtual() { const b = document.querySelector('.tab-btn.active .tab-lbl'); return b ? b.innerText.trim() : 'Painel'; }

// --- Interpretação do ditado (tudo local, sem internet) ---
function vozNumero(s) { s = String(s).trim(); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, ''); return parseFloat(s.replace(',', '.')); }
function proximoDiaSemana(idx) { const d = new Date(); let diff = (idx - d.getDay() + 7) % 7; if (diff === 0) diff = 7; d.setDate(d.getDate() + diff); return isoDe(d); }
function dataDiaMes(dia, mes) {
  const hoje = new Date(); let y = hoje.getFullYear(); let m = mes || hoje.getMonth() + 1;
  let d = new Date(y, m - 1, dia);
  if (isoDe(d) < hojeISO()) { if (mes) d = new Date(y + 1, m - 1, dia); else d = new Date(y, m, dia); }
  return isoDe(d);
}
/** Tira do texto um pedaço reconhecido e devolve o que casou (ou null). */
function vozExtrair(ctx, re) { const m = ctx.resto.match(re); if (!m) return null; ctx.resto = (ctx.resto.slice(0, m.index) + ' ' + ctx.resto.slice(m.index + m[0].length)).replace(/\s+/g, ' '); return m; }

function interpretarDitado(textoOriginal, aba) {
  let t = ' ' + textoOriginal.replace(/\s+/g, ' ').trim() + ' ';
  t = t.replace(/\b([A-Za-zÀ-ÿ]+)\b/g, (w) => NUM_PALAVRAS[w.toLowerCase()] !== undefined && !/^(um|uma)$/i.test(w) ? String(NUM_PALAVRAS[w.toLowerCase()]) : w);
  t = t.replace(/\b(\d{1,2})\s*h?\s+e\s+meia\b/gi, '$1:30').replace(/((?<![\wÀ-ÿ])[àa]s\s+\d{1,2})\s*h?\s+e\s+(\d{1,2})\b/gi, (s, a, b) => a + ':' + b.padStart(2, '0')); // "9 e meia" -> 9:30
  for (let i = 0; i < 3; i++) t = t.replace(/\b(\d+)\s+e\s+(\d+)\b/g, (s, a, b) => { a = Number(a); b = Number(b); return a >= 20 && a % 10 === 0 && b < a && String(b).length < String(a).length ? String(a + b) : s; }); // "cento e vinte" -> 120
  const ctx = { resto: t };
  const low = t.toLowerCase();

  // 1) o que é?
  let tipo = '';
  if (/\b(novo cliente|nova cliente|cadastrar cliente|cadastra cliente|cliente novo)\b/.test(low)) tipo = 'cliente';
  else if (/\b(pedido|encomenda|or[çc]amento)\b/.test(low)) tipo = 'pedido';
  else if (/\b(gastei|paguei|despesa|comprei|conta de)\b/.test(low)) tipo = 'despesa';
  else if (/\b(recebi|receita|entrou|me pagou|pagou)\b/.test(low)) tipo = 'receita';
  else if (/\b(tarefa|lembrete|lembrar de|preciso)\b/.test(low)) tipo = 'tarefa';
  else if (/\b(compromisso|reuni[ãa]o|consulta|evento|visita|agendar|marcar)\b/.test(low)) tipo = 'compromisso';
  else if (/\b(nota|anota|anotar|anota[çc][ãa]o|ideia)\b/.test(low)) tipo = 'nota';
  else tipo = { primos: 'pedido', home: 'compromisso', finances: 'despesa', tasks: 'tarefa', notes: 'nota' }[aba] || 'nota';

  // 2) pedaços comuns: valor, data, hora, telefone
  let valor = null;
  let m = vozExtrair(ctx, /(?:r\$\s*)(\d[\d.,]*)|(\d[\d.,]*)\s*(?:reais|real|contos?|pilas?)\b/i);
  if (m) valor = vozNumero(m[1] || m[2]);
  let data = '';
  if ((m = vozExtrair(ctx, /\bdepois de amanh[ãa](?![\wÀ-ÿ])/i))) { const d = new Date(); d.setDate(d.getDate() + 2); data = isoDe(d); }
  else if ((m = vozExtrair(ctx, /\bamanh[ãa](?![\wÀ-ÿ])/i))) { const d = new Date(); d.setDate(d.getDate() + 1); data = isoDe(d); }
  else if ((m = vozExtrair(ctx, /\bhoje\b/i))) data = hojeISO();
  else if ((m = vozExtrair(ctx, /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) { data = m[3] ? isoDe(new Date(Number(m[3].length === 2 ? '20' + m[3] : m[3]), m[2] - 1, m[1])) : dataDiaMes(Number(m[1]), Number(m[2])); }
  else if ((m = vozExtrair(ctx, /\b(?:dia\s+)?(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i))) data = dataDiaMes(Number(m[1]), MESES_NOME[m[2].toLowerCase()]);
  else if ((m = vozExtrair(ctx, /\bdia\s+(\d{1,2})\b/i))) data = dataDiaMes(Number(m[1]));
  else if ((m = vozExtrair(ctx, /\b(?:na |no |pr[óo]xim[ao] |essa |esta )?(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:[- ]feira)?(?: que vem)?\b/i))) data = proximoDiaSemana(DIAS_SEMANA_VOZ[m[1].toLowerCase().replace('ç', 'c').replace('á', 'a')]);
  let hora = '';
  if ((m = vozExtrair(ctx, /(?:(?<![\wÀ-ÿ])[àa]s\s+|\ba partir das\s+|\b)(\d{1,2})\s*(?:h|:|horas?\b)\s*(\d{2})?(?:\s*(?:min|minutos))?(\s+da\s+(?:tarde|noite))?/i)) || (m = vozExtrair(ctx, /(?<![\wÀ-ÿ])[àa]s\s+(\d{1,2})\b(\s+da\s+(?:tarde|noite))?/i))) {
    let h = Number(m[1]); let min = m[2] && /^\d+$/.test(m[2]) ? m[2] : '00';
    if (/tarde|noite/i.test(m[0]) && h < 12) h += 12;
    if (h <= 23) hora = `${String(h).padStart(2, '0')}:${min}`;
  }
  let telefone = '';
  if ((m = vozExtrair(ctx, /\(?\b\d{2}\)?\s*9?\s?\d{4}[-\s]?\d{4}\b/))) telefone = m[0].trim();

  const limpar = (s, extras) => {
    let r = ' ' + s + ' ';
    (extras || []).forEach(re => { r = r.replace(re, ' '); });
    r = r.replace(/(?<!\d)[,.]|[,.](?!\d)|;/g, ' ').replace(/\s+/g, ' ').trim();
    const conect = /^(de|do|da|dos|das|para|pra|pro|com|e|o|a|os|as|no|na|em|um|uma|que|entrega|entregar|prazo|valor|por)\s+/i;
    const conectFim = /\s+(de|do|da|dos|das|para|pra|pro|com|e|o|a|no|na|em|entrega|entregar|prazo|valor|por|at[ée])$/i;
    for (let i = 0; i < 6; i++) r = r.replace(conect, '').replace(conectFim, '');
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  const res = { tipo, texto: textoOriginal.trim(), campos: {} };

  if (tipo === 'pedido') {
    // cliente: primeiro procura um já cadastrado; senão, um nome próprio depois de "do/da/para"
    let cliente = null, clienteNovo = '';
    const achados = clients.filter(c => ctx.resto.toLowerCase().includes(c.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length);
    if (achados.length) { cliente = achados[0]; const i = ctx.resto.toLowerCase().indexOf(cliente.name.toLowerCase()); ctx.resto = ctx.resto.slice(0, i) + ' ' + ctx.resto.slice(i + cliente.name.length); ctx.resto = ctx.resto.replace(/\b(do|da|de|para|pra|pro)\s+(cliente\s+)?(?=\s|$)/i, ' '); }
    else if ((m = vozExtrair(ctx, /\b(?:do|da|para o|para a|para|pra|pro)\s+(?:cliente\s+)?([A-ZÀ-Ý][a-zà-ÿ]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ý][a-zà-ÿ]+)*)/) || vozExtrair(ctx, /\bcliente\s+([A-ZÀ-Ýa-zà-ÿ]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ]+)*)/))) clienteNovo = m[1].trim().replace(/^./, c => c.toUpperCase());
    let status = /\bor[çc]amento\b/i.test(t) ? 'orcamento' : /\bimprimindo\b/i.test(t) ? 'imprimindo' : 'aprovado';
    let material = '';
    const mats = [...MATERIAIS_3D].filter(x => x !== 'Outro').sort((a, b) => b.length - a.length);
    ctx.resto = ctx.resto.replace(/\bp\.?\s?l\.?\s?a\b/gi, 'PLA').replace(/\bp\.?\s?e\.?\s?t\.?\s?g\b/gi, 'PETG');
    for (const x of mats) { const re = new RegExp('\\b(?:em |de )?' + x.replace(/ /g, '\\s+') + '\\b', 'i'); if (re.test(ctx.resto)) { material = x; vozExtrair(ctx, re); break; } }
    let impressora = '';
    if (vozExtrair(ctx, /\b(?:na |pela )?(?:anycubic |any cubic )?kobra(?: x)?\b/i)) impressora = 'Anycubic Kobra X';
    else if ((m = vozExtrair(ctx, /\b(?:na |pela )?(?:bambu |bambu lab )?a ?1\s*(?:#|n[úu]mero\s*)?(1|2|primeira|segunda)\b/i))) impressora = /2|segunda/i.test(m[1]) ? IMPRESSORAS_3D[1] : IMPRESSORAS_3D[0];
    const cores = [];
    CORES_FILAMENTO.forEach(c => { const re = new RegExp('\\b' + c + '\\b', 'i'); if (re.test(ctx.resto)) { cores.push(c); ctx.resto = ctx.resto.replace(re, ' '); } });
    ctx.resto = ctx.resto.replace(/\b(na cor|nas cores|cor|cores)\b/gi, ' ');
    let qtd = 1;
    if ((m = vozExtrair(ctx, /\b(\d{1,4})\s*(?:x\b|unidades?\b|p[eç]as?\b)?/i))) qtd = Number(m[1]) || 1;
    const titulo = limpar(ctx.resto, [/\b(novo|nova|registrar|registra|cadastrar|criar|cria|adicionar|adiciona|anotar|anota)\b/gi, /\b(pedido|encomenda|or[çc]amento|imprimindo|aprovado)\b/gi, /\bno valor de\b/gi, /\bpara entrega\b/gi, /\bentrega(r)?\b/gi, /\bprazo\b/gi]);
    res.campos = { cliente, clienteNovo, titulo, qtd, material, cores: cores.join(' e ').replace(/^./, c => c.toUpperCase()), impressora, valor, data, status };
    res.resumo = [['Tipo', `📦 Pedido (${statusPedido(status).nome.toLowerCase()})`], ['Cliente', cliente ? cliente.name : clienteNovo ? clienteNovo + ' (novo)' : '—'], ['Peça', titulo || '—'], ['Qtd.', String(qtd)], ['Material / cor', [material, res.campos.cores].filter(Boolean).join(' · ') || '—'], ['Impressora', impressora || '—'], ['Valor', valor ? formatCurrency(valor) : '—'], ['Entrega', data ? rotuloDataLonga(data) : '—']];
    res.ok = !!titulo;
  } else if (tipo === 'cliente') {
    let email = ''; if ((m = vozExtrair(ctx, /\b[\w.+-]+@[\w-]+\.[\w.]+\b/))) email = m[0];
    let cidade = ''; if ((m = vozExtrair(ctx, /\b(?:de|em|mora em|da cidade de)\s+([A-ZÀ-Ý][a-zà-ÿ]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ]+)*)\s*$/))) cidade = m[1];
    const nome = limpar(ctx.resto, [/\b(novo|nova|cadastrar|cadastra|registrar|criar|adicionar)\b/gi, /\bclientes?\b/gi, /\b(telefone|whatsapp|zap|celular|n[úu]mero|e-?mail)\b/gi]);
    res.campos = { nome, telefone, email, cidade };
    res.resumo = [['Tipo', '👤 Cliente'], ['Nome', nome || '—'], ['WhatsApp', telefone || '—'], ['E-mail', email || '—'], ['Cidade', cidade || '—']];
    res.ok = !!nome;
  } else if (tipo === 'despesa' || tipo === 'receita') {
    const desc = limpar(ctx.resto, [/\b(gastei|paguei|despesa|comprei|recebi|receita|entrou|me pagou|pagou|lan[çc]ar|lan[çc]a|registrar)\b/gi]);
    const l = low; let cat = 'Outros';
    if (tipo === 'despesa') cat = /filamento|insumo|resina|bico|hotend|placa|pla\b|petg/.test(l) ? 'Filamento / Insumos' : /gasolina|combust[íi]vel|uber|[ôo]nibus|estacionamento/.test(l) ? 'Transporte' : /mercado|almo[çc]o|jantar|lanche|restaurante|comida|ifood/.test(l) ? 'Alimentação' : /aluguel|condom[íi]nio|luz|energia|[áa]gua|internet/.test(l) ? 'Moradia' : /imposto|das\b|mei\b/.test(l) ? 'Impostos' : 'Outros';
    else cat = /primos|impress[ãa]o|pe[çc]a|pedido/.test(l) ? 'Primos 3D' : /projeto|engenharia|laudo|obra|art\b/.test(l) ? 'Engenharia / Projetos' : 'Outros';
    res.campos = { desc, valor, data: data || hojeISO(), categoria: cat };
    res.resumo = [['Tipo', tipo === 'despesa' ? '💸 Despesa' : '💰 Receita'], ['Descrição', desc || '—'], ['Valor', valor ? formatCurrency(valor) : '— (falta dizer o valor)'], ['Data', rotuloDataLonga(res.campos.data)], ['Categoria', cat]];
    res.ok = !!desc && !!valor;
  } else if (tipo === 'tarefa') {
    const texto = limpar(ctx.resto, [/\b(nova|criar|adicionar|adiciona|anotar)\b/gi, /\btarefas?\b/gi, /\blembrete\b/gi, /\blembrar de\b/gi, /\bpreciso\b/gi, /\bat[ée](?![\wÀ-ÿ])/gi]);
    res.campos = { texto, data };
    res.resumo = [['Tipo', '✅ Tarefa'], ['O quê', texto || '—'], ['Prazo', data ? rotuloDataLonga(data) : '—']];
    res.ok = !!texto;
  } else if (tipo === 'compromisso') {
    const l = low;
    const tipoEv = /reuni[ãa]o|visita|obra|cliente|trabalho/.test(l) ? 'trabalho' : /consulta|m[ée]dico|dentista|exame/.test(l) ? 'saude' : /aula|prova|curso|estud/.test(l) ? 'estudo' : /anivers[áa]rio|festa|churrasco|jantar/.test(l) ? 'social' : /primos|fornecedor|neg[óo]cio/.test(l) ? 'negocios' : 'pessoal';
    const titulo = limpar(ctx.resto, [/\b(novo|marcar|agendar|criar|adicionar)\b/gi, /\bcompromissos?\b/gi, /\bevento\b/gi]);
    res.campos = { titulo, data: data || hojeISO(), hora, tipoEv };
    res.resumo = [['Tipo', `${tipoEvento(tipoEv).icone} Compromisso (${tipoEvento(tipoEv).nome})`], ['O quê', titulo || '—'], ['Quando', rotuloDataLonga(res.campos.data) + (hora ? ' às ' + hora : '')]];
    res.ok = !!titulo;
  } else {
    const conteudo = limpar(textoOriginal, [/^\s*(nova nota|nota|anota(r)?|anota[çc][ãa]o)\s*:?\s*/i]);
    res.tipo = 'nota'; res.campos = { conteudo };
    res.resumo = [['Tipo', '📝 Nota'], ['Texto', conteudo || '—']];
    res.ok = !!conteudo;
  }
  return res;
}

/** Leva o ditado para o formulário certo. salvar=true também envia o formulário. */
function aplicarDitado(salvarDireto) {
  const r = vozResultado; if (!r) return;
  if (salvarDireto && !r.ok) { toast('Faltou alguma informação — confira no formulário.'); salvarDireto = false; }
  const $ = id => document.getElementById(id); const c = r.campos;
  fecharVoz();
  let form, foco;
  if (r.tipo === 'pedido') {
    changeTab('primos'); cancelarEdicaoPedido();
    if (c.cliente) $('order-client').value = String(c.cliente.id);
    else if (c.clienteNovo) { $('order-client').value = '__novo'; $('order-client-new').hidden = false; $('order-client-new').value = c.clienteNovo; }
    $('order-title').value = c.titulo; $('order-qty').value = c.qtd || 1;
    if (c.material) $('order-material').value = c.material;
    $('order-color').value = c.cores || ''; $('order-printer').value = c.impressora || '';
    $('order-price').value = c.valor || ''; $('order-due').value = c.data || ''; $('order-status').value = c.status;
    $('order-notes').value = ''; form = 'order-form'; foco = 'order-title';
  } else if (r.tipo === 'cliente') {
    changeTab('primos'); cancelarEdicaoCliente();
    $('client-name').value = c.nome; $('client-phone').value = c.telefone; $('client-email').value = c.email; $('client-city').value = c.cidade;
    form = 'client-form'; foco = 'client-name';
  } else if (r.tipo === 'despesa' || r.tipo === 'receita') {
    changeTab('finances'); cancelarEdicaoFin();
    $('type').value = r.tipo === 'despesa' ? 'expense' : 'income'; preencherCategorias(false); definirCategoriaNaTela(c.categoria);
    $('desc').value = c.desc; $('amount').value = c.valor || ''; $('fin-date').value = c.data;
    form = 'finance-form'; foco = 'desc';
  } else if (r.tipo === 'tarefa') {
    changeTab('tasks'); cancelarEdicaoTarefa();
    $('task-desc').value = c.texto; $('task-due').value = c.data || '';
    form = 'task-form'; foco = 'task-desc';
  } else if (r.tipo === 'compromisso') {
    changeTab('home'); cancelarEdicaoEvento();
    $('event-title').value = c.titulo; $('event-date').value = c.data; $('event-time').value = c.hora || ''; $('event-type').value = c.tipoEv;
    form = 'event-form'; foco = 'event-title';
  } else {
    changeTab('notes'); cancelarEdicaoNota(); alternarTipoNota('texto', document.querySelector('#note-tipo span'));
    $('note-content').value = c.conteudo; form = 'note-form'; foco = 'note-content';
  }
  if (salvarDireto) $(form).requestSubmit();
  else setTimeout(() => { $(foco).scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('✎ Confira os campos e toque em salvar.'); }, 150);
}

// --- Janela de voz (folha que sobe de baixo) ---
function abrirVoz(modo) {
  vozModo = modo; vozResultado = null;
  const $ = id => document.getElementById(id);
  $('voice-title').innerText = modo === 'claude' ? '✳ Pedir mudança ao Claude' : '🎤 Ditado';
  $('voice-context').innerText = modo === 'claude'
    ? `Página: ${nomeAbaAtual()}. Diga o que quer mudar ou adicionar no app.`
    : `Ex.: "novo pedido do João, 3 vasos em PLA preto, 120 reais, entrega sexta" · "gastei 90 reais em filamento" · "reunião com cliente amanhã às 14h"`;
  $('voice-text').value = ''; $('voice-text').placeholder = modo === 'claude' ? 'Ex.: adiciona um campo de peso da peça (em gramas) nos pedidos' : 'Fale ou digite aqui...';
  $('voice-preview').innerHTML = ''; $('voice-actions').innerHTML = '';
  $('voice-send').hidden = modo !== 'claude'; $('voice-interpret').hidden = modo === 'claude';
  renderPedidosClaude(); if (modo === 'claude') atualizarClaude(true);
  $('voice-sheet').style.display = 'flex';
  iniciarGravacao();
}
function fecharVoz() { pararGravacao(); document.getElementById('voice-sheet').style.display = 'none'; }
function setVozStatus(txt, cor) { const el = document.getElementById('voice-status'); if (el) { el.innerText = txt || ''; el.style.color = cor || ''; } }
function atualizarBotaoGravar() {
  const b = document.getElementById('voice-rec'); if (!b) return;
  b.classList.toggle('on', vozGravando); b.innerText = vozGravando ? '■ Parar' : '🎙 Falar';
}
function iniciarGravacao() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const caixa = document.getElementById('voice-text');
  if (!SR) { setVozStatus('Toque no 🎤 do teclado para ditar.'); caixa.focus(); atualizarBotaoGravar(); return; }
  try {
    const r = new SR(); vozReconhecedor = r;
    r.lang = 'pt-BR'; r.interimResults = true; r.continuous = false;
    const base = caixa.value.trim() ? caixa.value.trim() + ' ' : '';
    r.onresult = (e) => { let s = ''; for (const res of e.results) s += res[0].transcript; caixa.value = base + s; };
    r.onerror = (e) => { setVozStatus(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microfone bloqueado — permita nas configurações, ou use o 🎤 do teclado.' : e.error === 'no-speech' ? 'Não ouvi nada. Toque em Falar de novo.' : 'Não consegui ouvir. Use o 🎤 do teclado.', '#ff9f0a'); };
    r.onend = () => { vozGravando = false; vozReconhecedor = null; atualizarBotaoGravar(); if (!document.getElementById('voice-status').style.color) setVozStatus(''); if (vozModo === 'dados' && caixa.value.trim()) interpretarVoz(); };
    r.start(); vozGravando = true; setVozStatus('Ouvindo...', '');
  } catch (err) { vozGravando = false; setVozStatus('Use o 🎤 do teclado para ditar.'); caixa.focus(); }
  atualizarBotaoGravar();
}
function pararGravacao() { if (vozReconhecedor) { try { vozReconhecedor.stop(); } catch (e) { } } vozGravando = false; atualizarBotaoGravar(); }
function alternarGravacao() { if (vozGravando) pararGravacao(); else { setVozStatus(''); iniciarGravacao(); } }

function interpretarVoz() {
  const txt = document.getElementById('voice-text').value.trim(); if (!txt) { toast('Fale ou digite primeiro.'); return; }
  vozResultado = interpretarDitado(txt, abaAtual());
  document.getElementById('voice-preview').innerHTML = `<div class="voice-card">${vozResultado.resumo.map(([k, v]) => `<div class="voice-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
  document.getElementById('voice-actions').innerHTML = `<button type="button" class="btn voice-primary" onclick="aplicarDitado(true)" ${vozResultado.ok ? '' : 'disabled'}>✓ Salvar</button><button type="button" class="btn" onclick="aplicarDitado(false)">✎ Revisar no formulário</button>`;
}

// --- ✳ Pedidos de mudança para o Claude (via o GitHub do próprio app) ---
// Pedido: { id, date, page, text, status, issue, pr, nota }
//   status: 'fila' (ainda não enviado) → 'enviado' (Claude trabalhando) → 'proposta' (esperando aprovação)
//           → 'publicado' | 'recusado' | 'sem-mudanca' (Claude pediu detalhes) | 'erro'
// Configuração SÓ deste aparelho (não sincroniza): lifeos_claude_config = { repo: 'usuario/Genesis', token }
// Isolamento: o app só escreve no repositório do próprio app (abre issue = pedido; aprova/recusa a proposta = pull request).
let claudeConfig = JSON.parse(localStorage.getItem('lifeos_claude_config')) || { repo: '', token: '' };
let claudePropostas = [];      // propostas abertas (ramos claude/pedido-N), lidas do GitHub
let claudeUltimaConsulta = 0;
const STATUS_PEDIDO_CLAUDE = {
  fila:          ['📥', 'guardado (não enviado)', '#8e8e93'],
  enviado:       ['⏳', 'Claude trabalhando…', '#ff9f0a'],
  proposta:      ['✅', 'proposta pronta — aprove acima', '#30d158'],
  publicado:     ['🚀', 'publicado', '#0a84ff'],
  recusado:      ['✕', 'recusado', '#8e8e93'],
  'sem-mudanca': ['💬', 'Claude precisa de mais detalhes', '#bf5af2'],
  erro:          ['⚠️', 'deu erro — tente pedir de novo', '#ff453a']
};

function repoPadrao() { const h = location.hostname; if (!h.endsWith('.github.io')) return ''; const seg = location.pathname.split('/').filter(Boolean)[0]; return seg ? `${h.split('.')[0]}/${seg}` : ''; }
function claudeConfigurado() { return !!(claudeConfig.repo && claudeConfig.token); }
/** Chamada à API do GitHub, sempre dentro do repositório do app. */
async function gh(caminho, opcoes = {}) {
  const r = await fetch(`https://api.github.com/repos/${claudeConfig.repo}${caminho}`, {
    ...opcoes,
    headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${claudeConfig.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}) }
  });
  if (!r.ok) { let msg = String(r.status); try { msg += ' ' + (await r.json()).message; } catch (e) { } throw new Error(msg); }
  return r.status === 204 ? null : r.json();
}

async function enviarPedidoClaude() {
  const txt = document.getElementById('voice-text').value.trim(); if (!txt) { toast('Fale ou digite o que quer mudar.'); return; }
  pararGravacao();
  const req = { id: novoId(), date: hojeISO(), page: nomeAbaAtual(), text: txt, status: 'fila' };
  claudeReqs.unshift(req); salvar('clauderequests', claudeReqs);
  document.getElementById('voice-text').value = '';
  if (!claudeConfigurado()) { renderPedidosClaude(); toast('✳ Pedido guardado. Para o Claude receber, configure em Ajustes → Claude na nuvem.', 6000); return; }
  await enviarUmPedido(req); renderPedidosClaude();
}
async function enviarUmPedido(req) {
  try {
    const resumo = req.text.replace(/\s+/g, ' ');
    const issue = await gh('/issues', { method: 'POST', body: JSON.stringify({ title: '✳ ' + resumo.slice(0, 70) + (resumo.length > 70 ? '…' : ''), body: `**Página do app:** ${req.page}\n\n**Pedido (ditado no app):**\n${req.text}` }) });
    req.issue = issue.number; req.status = 'enviado'; salvar('clauderequests', claudeReqs);
    toast('✳ Enviado! O Claude já começou; a proposta aparece aqui em alguns minutos.', 6000);
  } catch (e) { toast(`Não consegui enviar agora (${e.message}). O pedido ficou guardado.`, 6000); }
}
async function enviarPendentesClaude() { for (const r of claudeReqs.filter(x => x.status === 'fila')) await enviarUmPedido(r); renderPedidosClaude(); }
function removerPedidoClaude(id) { claudeReqs = claudeReqs.filter(r => r.id !== id); salvar('clauderequests', claudeReqs); renderPedidosClaude(); }

/** Lê do GitHub as propostas abertas e o andamento dos pedidos enviados. */
async function atualizarClaude(silencioso) {
  if (!claudeConfigurado()) { atualizarBadgeClaude(); return; }
  claudeUltimaConsulta = Date.now();
  try {
    const prs = await gh('/pulls?state=open&per_page=30');
    claudePropostas = prs.filter(p => /^claude\/pedido-\d+$/.test(p.head.ref)).map(p => ({ numero: p.number, issue: Number(p.head.ref.split('-').pop()), titulo: p.title.replace(/^✳\s*/, ''), resumo: (p.body || '').replace(/\s*Closes #\d+\s*$/i, '').trim(), url: p.html_url }));
    let mudou = false;
    for (const r of claudeReqs.filter(x => x.issue && (x.status === 'enviado' || x.status === 'proposta')).slice(0, 8)) {
      const p = claudePropostas.find(x => x.issue === r.issue);
      if (p) { if (r.status !== 'proposta' || r.pr !== p.numero) { r.status = 'proposta'; r.pr = p.numero; mudou = true; } continue; }
      const is = await gh(`/issues/${r.issue}`);
      if (is.state === 'closed') { r.status = is.state_reason === 'completed' ? 'publicado' : 'recusado'; mudou = true; continue; }
      if (r.status === 'enviado' && is.comments > 1) {
        const coms = await gh(`/issues/${r.issue}/comments?per_page=10`); const ultimo = (coms[coms.length - 1] || {}).body || '';
        if (/não alterou/i.test(ultimo)) { r.status = 'sem-mudanca'; r.nota = ultimo.replace(/^💬[^:]*:\s*/, '').trim(); mudou = true; }
        else if (/⚠️/.test(ultimo)) { r.status = 'erro'; mudou = true; }
      }
    }
    if (mudou) salvar('clauderequests', claudeReqs);
  } catch (e) { if (!silencioso) toast('Claude na nuvem: ' + e.message, 6000); }
  atualizarBadgeClaude(); renderPedidosClaude();
}
async function aprovarProposta(n) {
  if (!confirm('Publicar esta mudança no app?')) return;
  try {
    await gh(`/pulls/${n}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'squash' }) });
    const r = claudeReqs.find(x => x.pr === n); if (r) { r.status = 'publicado'; salvar('clauderequests', claudeReqs); }
    gh(`/git/refs/heads/claude/pedido-${(claudePropostas.find(x => x.numero === n) || {}).issue}`, { method: 'DELETE' }).catch(() => { });
    toast('🚀 Publicado! Em ~1 minuto feche e reabra o app para ver a mudança.', 8000);
  } catch (e) { toast('Não consegui publicar: ' + e.message, 6000); }
  atualizarClaude(true);
}
async function recusarProposta(n) {
  if (!confirm('Recusar esta proposta? Nada muda no app.')) return;
  const p = claudePropostas.find(x => x.numero === n);
  try {
    await gh(`/pulls/${n}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
    if (p) { await gh(`/issues/${p.issue}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' }) }); gh(`/git/refs/heads/claude/pedido-${p.issue}`, { method: 'DELETE' }).catch(() => { }); }
    const r = claudeReqs.find(x => x.pr === n); if (r) { r.status = 'recusado'; salvar('clauderequests', claudeReqs); }
    toast('Proposta recusada.');
  } catch (e) { toast('Não consegui recusar: ' + e.message, 6000); }
  atualizarClaude(true);
}

function atualizarBadgeClaude() {
  const b = document.querySelector('.fab-claude'); if (!b) return;
  let el = b.querySelector('.fab-badge'); const n = claudePropostas.length;
  if (!n) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('span'); el.className = 'fab-badge'; b.appendChild(el); }
  el.innerText = n;
}
function renderPedidosClaude() {
  const el = document.getElementById('voice-requests'); if (!el) return;
  if (vozModo !== 'claude') { el.innerHTML = ''; return; }
  let html = '';
  if (!claudeConfigurado()) html += `<div class="voice-card" style="padding:12px"><span class="hint" style="margin:0">Para o Claude mudar o app sozinho, configure em <strong>Ajustes → ✳ Claude na nuvem</strong>. Até lá, os pedidos ficam guardados aqui.</span><button type="button" class="btn" style="width:100%; margin-top:10px" onclick="fecharVoz(); changeTab('settings'); document.getElementById('claude-repo').scrollIntoView({ block: 'center' })">Abrir Ajustes</button></div>`;
  if (claudePropostas.length) {
    html += `<h4>Propostas para aprovar</h4>` + claudePropostas.map(p => `<div class="proposal-card"><strong>${esc(p.titulo)}</strong><p>${esc((p.resumo || 'Sem resumo.').replace(/\*\*?([^*\n]+)\*\*?/g, '$1').replace(/`([^`\n]+)`/g, '$1')).replace(/\n/g, '<br>')}</p><a href="${esc(p.url)}/files" target="_blank" rel="noopener">ver as mudanças no GitHub ›</a><div class="voice-buttons" style="margin-top:10px"><button type="button" class="btn voice-primary" onclick="aprovarProposta(${p.numero})">✓ Aprovar e publicar</button><button type="button" class="btn" onclick="recusarProposta(${p.numero})">✕ Recusar</button></div></div>`).join('');
  }
  const pend = claudeReqs.filter(r => r.status === 'fila').length;
  if (claudeReqs.length) {
    html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px"><h4>Seus pedidos</h4>${claudeConfigurado() ? `<span style="display:flex; gap:6px">${pend ? `<button type="button" class="mini-btn" onclick="enviarPendentesClaude()">Enviar ${pend} guardado${pend > 1 ? 's' : ''}</button>` : ''}<button type="button" class="mini-btn" onclick="atualizarClaude()">↻</button></span>` : ''}</div>`;
    html += `<ul class="transaction-list">${claudeReqs.slice(0, 10).map(r => { const s = STATUS_PEDIDO_CLAUDE[r.status] || STATUS_PEDIDO_CLAUDE.fila; return `<li><div class="transaction-info" style="flex:1"><span>${esc(r.text)}</span><small class="item-date">${esc(r.page)} · ${isoParaBR(r.date).slice(0, 5)} · <span style="color:${s[2]}">${s[0]} ${s[1]}</span></small>${r.nota ? `<small class="item-notes">${esc(r.nota)}</small>` : ''}</div><div class="item-actions"><button class="mini-btn" title="Tirar da lista" onclick="removerPedidoClaude(${r.id})">✕</button></div></li>`; }).join('')}</ul>`;
  }
  el.innerHTML = html;
}

// Ajustes → ✳ Claude na nuvem
function carregarClaudeConfigNaTela() {
  const r = document.getElementById('claude-repo'); const t = document.getElementById('claude-token');
  if (r) r.value = claudeConfig.repo || repoPadrao(); if (t) t.value = claudeConfig.token || '';
  setClaudeStatus(claudeConfigurado() ? '🟢 Configurado neste aparelho.' : '⚪ Não configurado.', claudeConfigurado() ? '#30d158' : '#8e8e93');
}
function setClaudeStatus(txt, cor) { const el = document.getElementById('claude-status'); if (el) { el.innerText = txt; el.style.color = cor || ''; } }
async function salvarClaudeConfig() {
  const repo = document.getElementById('claude-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
  const token = document.getElementById('claude-token').value.trim();
  if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) { alert('O repositório deve ser no formato usuario/nome — ex.: fulano/Genesis'); return; }
  claudeConfig = { repo, token };
  localStorage.setItem('lifeos_claude_config', JSON.stringify(claudeConfig)); // configuração do aparelho, como a da sincronização (não é dado do app)
  if (!claudeConfigurado()) { setClaudeStatus('⚪ Não configurado.', '#8e8e93'); return; }
  setClaudeStatus('🔄 Testando...', '#0a84ff');
  try { const info = await gh(''); await gh('/issues?per_page=1'); setClaudeStatus(`🟢 Conectado a ${info.full_name}. Já pode usar o botão ✳.`, '#30d158'); atualizarClaude(true); }
  catch (e) { setClaudeStatus('🔴 Não conectou: ' + e.message + ' — confira o token e as permissões.', '#ff453a'); }
}
// confere propostas ao abrir o app, ao voltar pra ele e a cada 60 s enquanto houver pedido em andamento
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - claudeUltimaConsulta > 30000) atualizarClaude(true); });
setInterval(() => { if (document.visibilityState === 'visible' && claudeConfigurado() && (claudeReqs.some(r => r.status === 'enviado') || document.getElementById('voice-sheet').style.display === 'flex')) atualizarClaude(true); }, 60000);
document.getElementById('voice-sheet').addEventListener('click', (e) => { if (e.target.id === 'voice-sheet') fecharVoz(); });

// Config/Backup
function exportData() { const data = { habits, habitlog: habitLog, orders, clients, events, finances: transactions, recurring, tasks, tasklists, notes, study: studyData, topics, materials, sessions, ritual, assets, moves, goals, projects, wealth, workouts, measures, hydration, meals, medical, profile, clauderequests: claudeReqs }; const dataStr = JSON.stringify(data, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const d = new Date(); const dateString = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`; a.download = `genesis_backup_${dateString}.json`; a.click(); URL.revokeObjectURL(url); const statusEl = document.getElementById('backup-status'); statusEl.innerText = "Backup exportado!"; setTimeout(() => statusEl.innerText = "", 3000); }
function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const data = JSON.parse(e.target.result); if (data.habits) salvar('habits', data.habits); if (data.habitlog) salvar('habitlog', data.habitlog); if (data.orders) salvar('orders', data.orders); if (data.clients) salvar('clients', data.clients); if (data.events) salvar('events', data.events); if (data.finances) salvar('finances', data.finances); if (data.recurring) salvar('recurring', data.recurring); if (data.tasks) salvar('tasks', data.tasks); if (data.tasklists) salvar('tasklists', data.tasklists); if (data.notes) salvar('notes', data.notes); if (data.study) salvar('study', data.study); if (data.topics) salvar('topics', data.topics); if (data.materials) salvar('materials', data.materials); if (data.sessions) salvar('sessions', data.sessions); if (data.ritual) salvar('ritual', data.ritual); ['assets', 'moves', 'goals', 'projects', 'wealth', 'workouts', 'measures', 'hydration', 'meals', 'medical', 'profile', 'clauderequests'].forEach(k => { if (data[k]) salvar(k, data[k]); }); location.reload(); } catch (error) { alert("Erro ao ler o arquivo."); } }; reader.readAsText(file); }

// ============================================================================
// SINCRONIZAÇÃO (Google Sheets via Apps Script — ver sync/Code.gs)
// Como funciona: cada módulo (habits, orders, ...) tem um carimbo de hora
// "updatedAt" da última vez que foi salvo neste aparelho. Ao sincronizar, o
// app manda tudo com os carimbos; o Code.gs guarda só o que for mais novo do
// que a planilha tem e devolve o estado final; o app adota daqui o que a
// planilha tiver de mais novo. Em empate, a planilha vence.
// URL e token ficam SÓ no localStorage deste aparelho (aba Config).
// ============================================================================
const SYNC_MODULOS = ['habits', 'habitlog', 'orders', 'clients', 'events', 'finances', 'recurring', 'tasks', 'tasklists', 'notes', 'study', 'topics', 'materials', 'sessions', 'ritual', 'assets', 'moves', 'goals', 'projects', 'wealth', 'workouts', 'measures', 'hydration', 'meals', 'medical', 'profile', 'clauderequests'];
const SYNC_INTERVALO_MS = 30000; // sincronização periódica com o app aberto

let syncMeta = JSON.parse(localStorage.getItem('lifeos_sync_meta')) || null;
if (!syncMeta) {
  // Primeira vez com sync neste aparelho: o que já existe ganha carimbo 1
  // ("existe, mas é antigo") e o que não existe ganha 0.
  syncMeta = {};
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
}
SYNC_MODULOS.forEach(m => { if (syncMeta[m] === undefined) syncMeta[m] = localStorage.getItem('lifeos_' + m) ? 1 : 0; });
let syncConfig = JSON.parse(localStorage.getItem('lifeos_sync_config')) || { url: '', token: '', agenda: false };
let agendaForcar = false; // botão "Enviar agenda agora"
let syncPendente = localStorage.getItem('lifeos_sync_pendente') === '1';
let syncTimer = null;
let syncEmAndamento = false;
let syncEditouDurante = false; // alguma gravação aconteceu enquanto a rede respondia?

/** Grava um módulo no localStorage, carimba a hora e agenda uma sincronização. */
function salvar(modulo, valor) {
  localStorage.setItem('lifeos_' + modulo, JSON.stringify(valor));
  syncMeta[modulo] = Date.now();
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
  syncEditouDurante = true;
  marcarPendente(true);
  agendarSync();
}

function marcarPendente(v) {
  syncPendente = v;
  localStorage.setItem('lifeos_sync_pendente', v ? '1' : '0');
  if (v && !syncEmAndamento) setSyncStatus('pendente');
}

/** Espera 2,5 s depois da última alteração antes de sincronizar (junta várias edições numa só). */
function agendarSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => sincronizar(), 2500);
}

function syncConfigurado() { return !!(syncConfig.url && syncConfig.token); }

async function sincronizar() {
  if (!syncConfigurado()) { setSyncStatus('naoconfig'); verificarNovoDia(); return; }
  if (syncEmAndamento) return;
  if (!navigator.onLine) { setSyncStatus('offline'); verificarNovoDia(); return; }

  syncEmAndamento = true; syncEditouDurante = false; setSyncStatus('andamento');
  try {
    const dados = {};
    SYNC_MODULOS.forEach(m => {
      const bruto = localStorage.getItem('lifeos_' + m);
      if (bruto !== null) dados[m] = { updatedAt: syncMeta[m] || 0, valor: JSON.parse(bruto) };
    });

    // Google Calendar: só pede o espelhamento quando os compromissos mudaram desde o último envio
    const agendaStamp = Number(localStorage.getItem('lifeos_agenda_stamp')) || 0;
    const precisaAgenda = !!syncConfig.agenda && (agendaForcar || (syncMeta.events || 0) > agendaStamp);
    agendaForcar = false;

    // Content-Type text/plain de propósito: evita o "preflight" CORS que o Apps Script não responde.
    const resp = await fetch(syncConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: syncConfig.token, acao: 'push', dados, agenda: precisaAgenda })
    });
    const r = await resp.json();
    if (!r.ok) throw new Error(r.erro || 'resposta inválida do servidor');

    const mudou = aplicarRemoto(r.dados || {});
    if (precisaAgenda) {
      if (r.agenda && r.agenda.ok) {
        localStorage.setItem('lifeos_agenda_stamp', String(syncMeta.events || 0));
        const a = r.agenda; setAgendaStatus('ok', `${a.total} na agenda · +${a.criados} criado${a.criados === 1 ? '' : 's'}, ${a.atualizados} atualizado${a.atualizados === 1 ? '' : 's'}, ${a.removidos} removido${a.removidos === 1 ? '' : 's'}`);
      } else if (r.agenda) setAgendaStatus('erro', r.agenda.erro || 'falha no Calendar');
      else setAgendaStatus('erro', 'o Code.gs implantado ainda é a versão 1 (sem agenda). Cole a v2 e crie uma nova versão da implantação.');
    }
    // se algo foi editado enquanto a rede respondia, continua pendente
    const editouDurante = syncEditouDurante;
    marcarPendente(editouDurante);
    localStorage.setItem('lifeos_sync_ultima', String(Date.now()));
    setSyncStatus(editouDurante ? 'pendente' : 'ok');
    if (mudou) redesenharTudo();
    if (editouDurante) agendarSync();
  } catch (err) {
    console.error('Sync:', err);
    setSyncStatus(navigator.onLine ? 'erro' : 'offline', String(err.message || err));
  } finally {
    syncEmAndamento = false;
    // Só depois de saber o estado mais novo é que fechamos o dia anterior
    // (evita que um aparelho zere hábitos que o outro já marcou hoje).
    verificarNovoDia();
  }
}

/** Adota o que veio da planilha se for mais novo (ou igual e diferente — empate: planilha vence). */
function aplicarRemoto(remoto) {
  let mudou = false;
  SYNC_MODULOS.forEach(m => {
    const r = remoto[m];
    if (!r || r.valor === null || r.valor === undefined) return;
    const local = syncMeta[m] || 0;
    if (r.updatedAt < local) return;
    const texto = JSON.stringify(r.valor);
    if (r.updatedAt === local && texto === localStorage.getItem('lifeos_' + m)) return;
    localStorage.setItem('lifeos_' + m, texto);
    syncMeta[m] = r.updatedAt; // sem carimbar hora nova: isso não é edição local
    mudou = true;
  });
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
  return mudou;
}

/** Recarrega as variáveis a partir do localStorage e redesenha todas as abas. */
function redesenharTudo() {
  habits = JSON.parse(localStorage.getItem('lifeos_habits')) || habits;
  habitLog = JSON.parse(localStorage.getItem('lifeos_habitlog')) || habitLog; if (!habitLog.dias) habitLog.dias = {};
  events = JSON.parse(localStorage.getItem('lifeos_events')) || [];
  orders = JSON.parse(localStorage.getItem('lifeos_orders')) || []; clients = JSON.parse(localStorage.getItem('lifeos_clients')) || [];
  transactions = JSON.parse(localStorage.getItem('lifeos_finances')) || [];
  recurring = JSON.parse(localStorage.getItem('lifeos_recurring')) || [];
  tasks = (JSON.parse(localStorage.getItem('lifeos_tasks')) || []).map(t => typeof t === 'string' ? { text: t, done: false } : t);
  tasklists = JSON.parse(localStorage.getItem('lifeos_tasklists')) || tasklists; normalizarTarefas();
  notes = JSON.parse(localStorage.getItem('lifeos_notes')) || []; normalizarNotas();
  const st = JSON.parse(localStorage.getItem('lifeos_study'));
  if (st) { studyData = st; if (!studyData.dias) studyData.dias = {}; }
  topics = JSON.parse(localStorage.getItem('lifeos_topics')) || []; materials = JSON.parse(localStorage.getItem('lifeos_materials')) || []; sessions = JSON.parse(localStorage.getItem('lifeos_sessions')) || []; ritual = JSON.parse(localStorage.getItem('lifeos_ritual')) || ritual;
  assets = JSON.parse(localStorage.getItem('lifeos_assets')) || []; moves = JSON.parse(localStorage.getItem('lifeos_moves')) || []; goals = JSON.parse(localStorage.getItem('lifeos_goals')) || []; projects = JSON.parse(localStorage.getItem('lifeos_projects')) || []; wealth = JSON.parse(localStorage.getItem('lifeos_wealth')) || wealth;
  workouts = JSON.parse(localStorage.getItem('lifeos_workouts')) || []; measures = JSON.parse(localStorage.getItem('lifeos_measures')) || []; hydration = JSON.parse(localStorage.getItem('lifeos_hydration')) || hydration; meals = JSON.parse(localStorage.getItem('lifeos_meals')) || []; medical = JSON.parse(localStorage.getItem('lifeos_medical')) || [];
  profile = JSON.parse(localStorage.getItem('lifeos_profile')) || profile; aplicarPerfil();
  claudeReqs = JSON.parse(localStorage.getItem('lifeos_clauderequests')) || []; renderPedidosClaude();
  renderFocusTab(); renderPrimos(); renderEvents(); updateFinanceValues(); renderFinances(); renderRecorrentes(); renderTaskLists(); renderTasks(); renderNotes(); redesenharEstudos(); redesenharNegocios(); renderSaude(); updateStudyStats(); renderJournal(); atualizarSaudacao();
}

function setAgendaStatus(estado, texto) {
  const el = document.getElementById('agenda-status'); if (!el) return;
  localStorage.setItem('lifeos_agenda_status', JSON.stringify({ estado, texto, quando: Date.now() }));
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  el.innerText = (estado === 'ok' ? '📆 Google Agenda ' + hora + ': ' : '📆 Google Agenda — erro: ') + texto;
  el.style.color = estado === 'ok' ? '#30d158' : '#ff453a';
}
function enviarAgendaAgora() {
  if (!syncConfig.agenda) { toast('Marque "Enviar para o Google Calendar" e clique em Salvar e testar primeiro.'); return; }
  agendaForcar = true; sincronizar();
}
function setSyncStatus(estado, detalhe) {
  const el = document.getElementById('sync-status');
  const dot = document.getElementById('sync-dot');
  const ultima = localStorage.getItem('lifeos_sync_ultima');
  const hora = ultima ? new Date(Number(ultima)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const mapa = {
    naoconfig: ['⚪', 'Sincronização não configurada — preencha URL e token abaixo.', '#8e8e93'],
    andamento: ['🔄', 'Sincronizando...', '#0a84ff'],
    ok:        ['🟢', 'Sincronizado' + (hora ? ' às ' + hora : '') + ' · automático a cada 30 s', '#30d158'],
    pendente:  ['🟡', 'Alterações pendentes' + (hora ? ' (último sync ' + hora + ')' : ''), '#ff9f0a'],
    offline:   ['🔴', 'Offline — vai sincronizar quando a internet voltar.', '#ff453a'],
    erro:      ['🔴', 'Erro: ' + (detalhe || 'falha na sincronização'), '#ff453a']
  };
  const [icone, texto, cor] = mapa[estado] || mapa.naoconfig;
  if (el) { el.innerText = icone + ' ' + texto; el.style.color = cor; }
  if (dot) { dot.style.background = cor; dot.title = texto; }
}

/** Botão "Salvar e testar" da aba Config. */
function salvarSyncConfig() {
  const url = document.getElementById('sync-url').value.trim();
  const token = document.getElementById('sync-token').value.trim();
  if (url && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) {
    alert('A URL deve ser a do "App da Web" do Apps Script: começa com https://script.google.com/macros/s/ e termina em /exec');
    return;
  }
  const agenda = !!(document.getElementById('sync-agenda') && document.getElementById('sync-agenda').checked);
  if (agenda && !syncConfig.agenda) agendaForcar = true; // acabou de ligar: manda tudo de uma vez
  syncConfig = { url, token, agenda };
  localStorage.setItem('lifeos_sync_config', JSON.stringify(syncConfig));
  if (syncConfigurado()) { marcarPendente(true); sincronizar(); } else setSyncStatus('naoconfig');
}

function alternarVerUrl() {
  const u = document.getElementById('sync-url'); const b = document.getElementById('btn-ver-url'); if (!u) return;
  const mostrar = u.type === 'password'; u.type = mostrar ? 'text' : 'password';
  if (b) { b.innerText = mostrar ? '🙈' : '👁️'; b.title = mostrar ? 'Ocultar URL' : 'Mostrar URL'; }
}
function carregarSyncConfigNaTela() {
  const u = document.getElementById('sync-url'); const t = document.getElementById('sync-token');
  if (u) u.value = syncConfig.url || '';
  if (t) t.value = syncConfig.token || '';
  const a = document.getElementById('sync-agenda'); if (a) a.checked = !!syncConfig.agenda;
  const st = JSON.parse(localStorage.getItem('lifeos_agenda_status') || 'null'); const el = document.getElementById('agenda-status');
  if (st && el) { el.innerText = (st.estado === 'ok' ? '📆 Google Agenda ' + new Date(st.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ': ' : '📆 Google Agenda — erro: ') + st.texto; el.style.color = st.estado === 'ok' ? '#30d158' : '#ff453a'; }
}

// Gatilhos automáticos: voltou a internet / voltou pro app (celular) / a cada 30 s com o app visível
window.addEventListener('online', () => sincronizar());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
setInterval(() => { if (document.visibilityState === 'visible' && syncConfigurado()) sincronizar(); }, SYNC_INTERVALO_MS);

// INICIALIZAÇÃO
changeJournalTab('day', document.querySelector('#journal-tabs span.active'));
if (normalizarNotas()) localStorage.setItem('lifeos_notes', JSON.stringify(notes));
renderPaletaNota(); if (normalizarTarefas()) { localStorage.setItem('lifeos_tasks', JSON.stringify(tasks)); localStorage.setItem('lifeos_tasklists', JSON.stringify(tasklists)); }
renderTaskLists(); preencherTiposEvento(); preencherCategorias(false); preencherCategoriasRec(); document.getElementById('fin-date').value = hojeISO(); gerarRecorrentes();
updatePomodoroTime(); updateStudyStats(); renderFocusTab(); renderCalendar(); updateFinanceValues(); renderFinances(); renderPrimos(); renderTasks(); renderNotes(); renderEvents(); renderRecorrentes();
document.getElementById('session-date').value = hojeISO(); garantirRitual(); redesenharEstudos(); ['workout-date', 'measure-date', 'meal-date'].forEach(i => document.getElementById(i).value = hojeISO()); renderSaude(); document.getElementById('move-date').value = hojeISO(); document.getElementById('asset-current-at').value = hojeISO(); redesenharNegocios(); renderEvents(); renderCalendar();
aplicarPerfil(); carregarPrefsNaTela(); atualizarSaudacao(); atualizarBotaoDia();
if (!profile.name && !localStorage.getItem('lifeos_perfil_avisado')) { localStorage.setItem('lifeos_perfil_avisado', '1'); setTimeout(() => toast('👤 Bem-vindo ao Genesis! Coloque seu nome em ⚙️ Config → Perfil.', 8000), 1500); }
carregarClaudeConfigNaTela(); atualizarClaude(true); carregarSyncConfigNaTela(); setSyncStatus(syncConfigurado() ? (syncPendente ? "pendente" : "ok") : "naoconfig"); sincronizar();
