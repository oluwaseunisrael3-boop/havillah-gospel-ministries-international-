/* ============================================================
   Havilah Gospel Ministries — Public Site Logic (Supabase-backed)
   ============================================================ */

document.getElementById('year').textContent = new Date().getFullYear();

function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
revealEls.forEach(el => observer.observe(el));

/* ============================================================
   DEVOTIONAL
   ============================================================ */
async function renderDevotional() {
  const container = document.getElementById('devoContainer');
  const { data, error } = await sb.from('devotionals').select('*').order('created_at', { ascending: false }).limit(1);
  if (error) {
    console.error(error);
    container.innerHTML = `<div class="devo-card"><p class="devo-empty">Unable to load devotional right now.</p></div>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<div class="devo-card"><p class="devo-empty">No devotional has been posted yet. Please check back soon.</p></div>`;
    return;
  }
  const latest = data[0];
  container.innerHTML = `
    <div class="devo-card">
      <div class="devo-date">${formatDate(latest.created_at)}</div>
      <div class="devo-title">${escapeHtml(latest.title)}</div>
      ${latest.verse ? `<div class="devo-verse">"${escapeHtml(latest.verse)}"${latest.verse_ref ? `<cite>${escapeHtml(latest.verse_ref)} (KJV)</cite>` : ''}</div>` : ''}
      <div class="devo-body">${escapeHtml(latest.body)}</div>
    </div>
  `;
}

/* ============================================================
   BIBLE PLAN (kept local — personal reading progress, not shared ministry data)
   ============================================================ */
function getStoredPlanDay() {
  const saved = localStorage.getItem('havilah_plan_day');
  return saved ? parseInt(saved, 10) : 1;
}
function setStoredPlanDay(day) {
  const clamped = Math.max(1, Math.min(365, day));
  localStorage.setItem('havilah_plan_day', clamped);
  return clamped;
}
function renderPlanDay() {
  const day = getStoredPlanDay();
  const readings = getPlanDay(day);
  document.getElementById('planDayNum').textContent = day;
  document.getElementById('planReadings').innerHTML = readings.map(r => `<span class="plan-reading-chip">${r}</span>`).join('');
  document.getElementById('planProgressFill').style.width = ((day / 365) * 100).toFixed(1) + '%';
}
function planNext() { setStoredPlanDay(getStoredPlanDay() + 1); renderPlanDay(); }
function planPrev() { setStoredPlanDay(getStoredPlanDay() - 1); renderPlanDay(); }
function planJumpTo() {
  const val = parseInt(document.getElementById('planJump').value, 10);
  if (!val || val < 1 || val > 365) { showToast('Enter a day between 1 and 365'); return; }
  setStoredPlanDay(val);
  renderPlanDay();
  document.getElementById('planJump').value = '';
}

/* ============================================================
   SERMONS
   ============================================================ */
async function renderSermons() {
  const grid = document.getElementById('sermonGrid');
  const { data, error } = await sb.from('sermons').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); grid.innerHTML = `<p class="sermon-empty">Unable to load sermons right now.</p>`; return; }
  if (!data.length) { grid.innerHTML = `<p class="sermon-empty">No sermons uploaded yet. Please check back soon.</p>`; return; }

  grid.innerHTML = data.map(s => {
    const ytId = extractYouTubeId(s.youtube_url);
    const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
    return `
      <div class="sermon-card">
        <div class="sermon-thumb" onclick="playVideo('${ytId || ''}')">
          ${thumb ? `<img src="${thumb}" alt="${escapeHtml(s.title)}" loading="lazy">` : ''}
          <div class="sermon-play">
            <svg viewBox="0 0 24 24" fill="#C8963E"><circle cx="12" cy="12" r="11" fill="rgba(13,12,11,0.65)" stroke="#C8963E" stroke-width="1.5"/><path d="M10 8l6 4-6 4V8z" fill="#F4EDE0"/></svg>
          </div>
        </div>
        <div class="sermon-body">
          <div class="sermon-tag">${escapeHtml(s.category || 'Teaching')}</div>
          <div class="sermon-title">${escapeHtml(s.title)}</div>
          <div class="sermon-meta">${formatDate(s.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function playVideo(ytId) {
  if (!ytId) { showToast('Video link unavailable'); return; }
  const wrap = document.getElementById('videoFrameWrap');
  wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  document.getElementById('videoModal').classList.add('open');
}
function closeVideo() {
  document.getElementById('videoModal').classList.remove('open');
  document.getElementById('videoFrameWrap').innerHTML = '';
}

/* ============================================================
   EVENTS
   ============================================================ */
let _eventsCache = [];

async function renderEvents() {
  const container = document.getElementById('eventsContainer');
  const { data, error } = await sb.from('events').select('*').order('event_date', { ascending: true });
  if (error) { console.error(error); container.innerHTML = `<p class="event-empty">Unable to load events right now.</p>`; return; }
  _eventsCache = data;
  if (!data.length) { container.innerHTML = `<p class="event-empty">No upcoming programs at this time. Please check back soon.</p>`; return; }

  container.innerHTML = data.map(ev => {
    const d = new Date(ev.event_date + 'T00:00:00');
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `
      <div class="event-card">
        <div class="event-date-box"><div class="mon">${mon}</div><div class="day">${day}</div></div>
        <div class="event-body">
          <div class="event-title">${escapeHtml(ev.title)}</div>
          <div class="event-meta">
            <span><svg viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>${escapeHtml(ev.location || 'Havilah Gospel Ministries')}</span>
            ${ev.event_time ? `<span><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 10.6l-4.3 2.5-.7-1.2 3.8-2.2V6h1.2z"/></svg>${escapeHtml(ev.event_time)}</span>` : ''}
          </div>
          ${ev.description ? `<div class="event-desc">${escapeHtml(ev.description)}</div>` : ''}
          <button class="btn btn-gold" style="padding:10px 22px;font-size:12px;" onclick="openRegister('${ev.id}')">Register Now</button>
        </div>
      </div>
    `;
  }).join('');
}

let _pendingEventId = null;
function openRegister(eventId) {
  const ev = _eventsCache.find(e => e.id === eventId);
  if (!ev) return;
  _pendingEventId = eventId;
  document.getElementById('regModalEventName').textContent = `Register for "${ev.title}"`;
  document.getElementById('regName').value = '';
  document.getElementById('regPhone').value = '';
  document.getElementById('regModal').classList.add('open');
}
function closeRegister() {
  document.getElementById('regModal').classList.remove('open');
  _pendingEventId = null;
}
async function confirmRegister() {
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  if (!name || !phone) { showToast('Please enter your name and phone number'); return; }
  const ev = _eventsCache.find(e => e.id === _pendingEventId);
  if (!ev) { closeRegister(); return; }

  const { error } = await sb.from('registrations').insert({
    event_id: ev.id, event_title: ev.title, name, phone
  });
  if (error) { console.error(error); showToast('Something went wrong. Please try again.'); return; }
  closeRegister();
  showToast('You are registered! We will see you there.');
}

/* ============================================================
   COMMUNITY WALL
   ============================================================ */
let currentWallFilter = 'all';
let _wallCache = [];

async function renderWall() {
  const container = document.getElementById('wallContainer');
  const { data, error } = await sb.from('wall_posts').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); container.innerHTML = `<p class="no-events">Unable to load posts right now.</p>`; return; }
  _wallCache = data;
  drawWall();
}

function drawWall() {
  const container = document.getElementById('wallContainer');
  const filtered = currentWallFilter === 'all' ? _wallCache : _wallCache.filter(p => p.type === currentWallFilter);
  if (!filtered.length) { container.innerHTML = `<p class="no-events">Nothing here yet. Be the first to share.</p>`; return; }
  const typeLabels = { prayer: 'Prayer Request', testimony: 'Testimony', word: 'A Word' };
  container.innerHTML = filtered.map(p => `
    <div class="wall-post">
      <div class="wall-post-head">
        <span class="wall-post-name">${escapeHtml(p.name)}</span>
        <span class="wall-post-type type-${p.type}">${typeLabels[p.type] || p.type}</span>
      </div>
      <div class="wall-post-text">${escapeHtml(p.message)}</div>
      <div class="wall-post-time">${timeAgo(p.created_at)}</div>
    </div>
  `).join('');
}

function filterWall(type, btn) {
  currentWallFilter = type;
  document.querySelectorAll('.community-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  drawWall();
}

async function submitPost() {
  const name = document.getElementById('postName').value.trim();
  const type = document.getElementById('postType').value;
  const message = document.getElementById('postMessage').value.trim();
  if (!name || !message) { showToast('Please enter your name and message'); return; }

  const btn = document.getElementById('postSubmitBtn');
  btn.disabled = true;
  const { error } = await sb.from('wall_posts').insert({ name, type, message });
  btn.disabled = false;
  if (error) { console.error(error); showToast('Something went wrong. Please try again.'); return; }

  document.getElementById('postName').value = '';
  document.getElementById('postMessage').value = '';
  showToast('Posted. Thank you for sharing.');
  renderWall();
}

/* ============================================================
   GIVING — copy account number
   ============================================================ */
function copyAccount(elId, btn) {
  const text = document.getElementById(elId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
  }).catch(() => { showToast('Account number: ' + text); });
}

/* ---------- init ---------- */
renderDevotional();
renderPlanDay();
renderSermons();
renderEvents();
renderWall();

document.getElementById('videoModal').addEventListener('click', (e) => {
  if (e.target.id === 'videoModal') closeVideo();
});
document.getElementById('regModal').addEventListener('click', (e) => {
  if (e.target.id === 'regModal') closeRegister();
});

/* ---------- live updates: refresh public content when admin changes it ---------- */
sb.channel('public-devotionals').on('postgres_changes', { event: '*', schema: 'public', table: 'devotionals' }, renderDevotional).subscribe();
sb.channel('public-sermons').on('postgres_changes', { event: '*', schema: 'public', table: 'sermons' }, renderSermons).subscribe();
sb.channel('public-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, renderEvents).subscribe();
sb.channel('public-wall').on('postgres_changes', { event: '*', schema: 'public', table: 'wall_posts' }, renderWall).subscribe();
