const STORAGE_KEY = 'us_long_distance_app_v1';

const questions = [
  'What made you feel loved by me recently?',
  'What is one thing you are looking forward to doing together?',
  'What do you need more of from me this week?',
  'What is a small memory of us that still makes you smile?',
  'What is something you are proud of me for?',
  'What would make our next call feel special?',
  'What is one insecurity we can handle more gently together?',
  'What ordinary daily thing do you wish we could do together?'
];

const dateIdeas = [
  'Cook the same meal on video call and rate each other’s plating.',
  'Start the same movie at the same time and keep a voice call open.',
  'Create a shared playlist: 5 songs for “us now” and 5 for “our future”.',
  'Virtual museum walk: screen-share a gallery or travel destination.',
  'Order each other a surprise snack and open it together on video.',
  'Plan your dream weekend together with a budget and itinerary.',
  'Play 20 questions, but every answer must include a story.',
  'Do a “show me your day” photo tour of your room, walk, or workspace.'
];

const quiz = [
  'What is my ideal way to be comforted when I am stressed?',
  'What is my favourite type of date?',
  'What makes me feel ignored?',
  'What is one long-term dream I talk about often?',
  'What would I choose: quality time, reassurance, gifts, acts of service, or touch?',
  'What is something small that instantly improves my mood?'
];

const thisThat = [
  'Morning call or late-night call?', 'Beach trip or mountain cabin?', 'Movie night or game night?',
  'Surprise visit or planned visit?', 'Matching outfits or matching playlists?', 'Voice notes or long texts?'
];

const defaultState = {
  settings: { partnerA: 'Partner A', partnerB: 'Partner B', anniversary: '', nextVisit: '' },
  questionIndex: 0,
  answers: {}, moods: [], notes: [], memories: [], plans: [], goals: []
};
let state = loadState();
let deferredPrompt;

function loadState() {
  try { return { ...structuredClone(defaultState), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
  catch { return structuredClone(defaultState); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
function $(id) { return document.getElementById(id); }
function names() { return [state.settings.partnerA || 'Partner A', state.settings.partnerB || 'Partner B']; }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(value='') { return value.replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function dateText(value) { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''; }

function setView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === id));
  $('viewTitle').textContent = document.querySelector(`[data-view="${id}"]`)?.textContent || 'Dashboard';
}

document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.jump)));

function renderPeopleSelect(select) {
  const [a,b] = names();
  select.innerHTML = `<option>${escapeHtml(a)}</option><option>${escapeHtml(b)}</option>`;
}
function currentQuestion() { return questions[state.questionIndex % questions.length]; }

function render() {
  const [a,b] = names();
  $('coupleNames').textContent = `${a} + ${b}`;
  $('dashboardQuestion').textContent = currentQuestion();
  $('dailyQuestion').textContent = currentQuestion();
  $('personAName').textContent = a; $('personBName').textContent = b;
  $('partnerA').value = state.settings.partnerA || ''; $('partnerB').value = state.settings.partnerB || ''; $('anniversary').value = state.settings.anniversary || '';
  renderPeopleSelect($('moodPerson')); renderPeopleSelect($('noteFrom'));
  $('memoryCount').textContent = state.memories.length;
  $('goalCount').textContent = `${state.goals.filter(g => !g.done).length} active`;
  renderCountdown(); renderMood(); renderAnswers(); renderNotes(); renderMemories(); renderPlans(); renderGoals(); renderDateLinks();
}

function renderCountdown() {
  const visit = state.settings.nextVisit;
  if (!visit) { $('countdownText').textContent = 'Set your next visit date'; return; }
  const ms = new Date(visit) - new Date();
  if (ms <= 0) { $('countdownText').textContent = 'You are together now, or the visit date has passed ♡'; return; }
  const days = Math.floor(ms / 86400000); const hours = Math.floor((ms % 86400000) / 3600000);
  $('countdownText').textContent = `${days} days ${hours} hours to go`;
}
function renderMood() {
  const latest = state.moods.at(-1);
  $('moodSummary').textContent = latest ? `${latest.person}: ${latest.value}` : 'No check-ins yet';
}
function renderAnswers() {
  const key = todayKey(); const ans = state.answers[key] || {};
  $('answerA').value = ans.a || ''; $('answerB').value = ans.b || '';
  $('answerReveal').innerHTML = ans.a && ans.b
    ? `<strong>Both answers are in.</strong><hr><p><b>${escapeHtml(names()[0])}:</b> ${escapeHtml(ans.a)}</p><p><b>${escapeHtml(names()[1])}:</b> ${escapeHtml(ans.b)}</p>`
    : 'Answers reveal here after both partners have written their response on the same device or imported shared data.';
}
function renderList(containerId, items, formatter, onDelete) {
  const el = $(containerId); el.innerHTML = '';
  if (!items.length) { el.innerHTML = '<p class="muted">Nothing here yet.</p>'; return; }
  items.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'item';
    row.innerHTML = `<div>${formatter(item)}</div><button class="danger">Delete</button>`;
    row.querySelector('button').addEventListener('click', () => { onDelete(index); saveState(); });
    el.appendChild(row);
  });
}
function renderNotes() { renderList('notesList', state.notes.slice().reverse(), n => `<b>${escapeHtml(n.from)}</b><p>${escapeHtml(n.text)}</p><small>${dateText(n.created)}</small>`, i => state.notes.splice(state.notes.length-1-i,1)); }
function renderPlans() { renderList('plansList', state.plans.sort((a,b)=>new Date(a.date)-new Date(b.date)), p => `<b>${escapeHtml(p.title)}</b><small>${dateText(p.date)}</small><p>${escapeHtml(p.note||'')}</p>`, i => state.plans.splice(i,1)); }
function renderGoals() { renderList('goalsList', state.goals, g => `<label class="inline"><input type="checkbox" ${g.done?'checked':''} data-goal="${g.id}"> <b>${escapeHtml(g.title)}</b></label><p>${escapeHtml(g.steps||'')}</p>`, i => state.goals.splice(i,1)); document.querySelectorAll('[data-goal]').forEach(cb => cb.addEventListener('change', e => { const g=state.goals.find(x=>x.id===e.target.dataset.goal); if(g){g.done=e.target.checked; saveState();}})); }
function renderMemories() {
  const el = $('memoriesList'); el.innerHTML = '';
  if (!state.memories.length) { el.innerHTML = '<p class="muted">No memories saved yet.</p>'; return; }
  state.memories.forEach((m, i) => {
    const card = document.createElement('article'); card.className = 'memory-card';
    card.innerHTML = `${m.photo ? `<img src="${m.photo}" alt="${escapeHtml(m.title)}">` : ''}<div><b>${escapeHtml(m.title)}</b><small>${m.date || ''}</small><p>${escapeHtml(m.text || '')}</p><button class="danger">Delete</button></div>`;
    card.querySelector('button').addEventListener('click', () => { state.memories.splice(i,1); saveState(); }); el.appendChild(card);
  });
}
function renderDateLinks() {
  $('dateLinks').innerHTML = ['Watch together', 'Shared playlist', 'Video call ritual'].map(x => `<article class="card"><h3>${x}</h3><p class="muted">Add the link or plan details under Plans after choosing an idea.</p></article>`).join('');
}

$('moodForm').addEventListener('submit', e => { e.preventDefault(); state.moods.push({ person:$('moodPerson').value, value:$('moodValue').value, note:$('moodNote').value, created:new Date().toISOString() }); $('moodNote').value=''; saveState(); });
$('answerFormA').addEventListener('submit', e => { e.preventDefault(); state.answers[todayKey()] = { ...(state.answers[todayKey()]||{}), a:$('answerA').value }; saveState(); });
$('answerFormB').addEventListener('submit', e => { e.preventDefault(); state.answers[todayKey()] = { ...(state.answers[todayKey()]||{}), b:$('answerB').value }; saveState(); });
$('newQuestionBtn').addEventListener('click', () => { state.questionIndex++; saveState(); });
$('noteForm').addEventListener('submit', e => { e.preventDefault(); state.notes.push({ from:$('noteFrom').value, text:$('noteText').value, created:new Date().toISOString() }); $('noteText').value=''; saveState(); });
$('memoryForm').addEventListener('submit', async e => { e.preventDefault(); const file=$('memoryPhoto').files[0]; const photo = file ? await fileToDataUrl(file) : ''; state.memories.push({ title:$('memoryTitle').value, date:$('memoryDate').value, text:$('memoryText').value, photo }); e.target.reset(); saveState(); });
$('planForm').addEventListener('submit', e => { e.preventDefault(); const plan={ title:$('planTitle').value, date:$('planDate').value, note:$('planNote').value }; state.plans.push(plan); if ($('setAsVisit').checked) state.settings.nextVisit = plan.date; e.target.reset(); saveState(); });
$('goalForm').addEventListener('submit', e => { e.preventDefault(); state.goals.push({ id:crypto.randomUUID(), title:$('goalTitle').value, steps:$('goalSteps').value, done:false }); e.target.reset(); saveState(); });
$('settingsForm').addEventListener('submit', e => { e.preventDefault(); state.settings.partnerA=$('partnerA').value||'Partner A'; state.settings.partnerB=$('partnerB').value||'Partner B'; state.settings.anniversary=$('anniversary').value; saveState(); });
$('randomDateBtn').addEventListener('click', () => $('dateIdea').textContent = dateIdeas[Math.floor(Math.random()*dateIdeas.length)]);
$('saveDatePlanBtn').addEventListener('click', () => { const idea=$('dateIdea').textContent || dateIdeas[0]; state.plans.push({ title:'Virtual date: '+idea.slice(0,40), date:new Date().toISOString().slice(0,16), note:idea }); saveState(); setView('calendar'); });
$('nextQuizBtn').addEventListener('click', () => $('quizQuestion').textContent = quiz[Math.floor(Math.random()*quiz.length)]);
$('nextThisThatBtn').addEventListener('click', () => $('thisOrThat').textContent = thisThat[Math.floor(Math.random()*thisThat.length)]);
$('exportBtn').addEventListener('click', () => { const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='us-couples-app-backup.json'; a.click(); URL.revokeObjectURL(a.href); });
$('importFile').addEventListener('change', async e => { const file=e.target.files[0]; if(!file) return; state = JSON.parse(await file.text()); saveState(); });

function fileToDataUrl(file) { return new Promise((resolve, reject) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; $('installBtn').classList.remove('hidden'); });
$('installBtn').addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; $('installBtn').classList.add('hidden'); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
setInterval(renderCountdown, 60000);
$('dateIdea').textContent = dateIdeas[0]; $('quizQuestion').textContent = quiz[0]; $('thisOrThat').textContent = thisThat[0];
render();
