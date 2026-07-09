/* ============================================================
   Havilah Gospel Ministries — Admin Dashboard Logic (Supabase-backed)
   ============================================================ */

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function confirmDelete(msg) {
  return confirm(msg || 'Are you sure you want to delete this? This cannot be undone.');
}

/* ============================================================
   AUTH
   ============================================================ */
async function doLogin() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Log In';

  if (error) {
    errorEl.textContent = 'Incorrect email or password. Please try again.';
    document.getElementById('passwordInput').value = '';
    return;
  }
  errorEl.textContent = '';
  showDashboard();
}

async function doLogout() {
  await sb.auth.signOut();
  document.getElementById('dashScreen').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('emailInput').value = '';
  document.getElementById('passwordInput').value = '';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashScreen').classList.add('active');
  refreshAll();
}

async function checkExistingSession() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showDashboard();
  }
}
checkExistingSession();

/* ---------- panel switching ---------- */
function switchPanel(name, btn) {
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.dash-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  btn.classList.add('active');
  refreshAll();
}

/* ============================================================
   DEVOTIONALS
   ============================================================ */
async function postDevotional() {
  const title = document.getElementById('devoTitle').value.trim();
  const verse = document.getElementById('devoVerse').value.trim();
  const verseRef = document.getElementById('devoVerseRef').value.trim();
  const body = document.getElementById('devoBody').value.trim();
  if (!title || !body) { showToast('Please enter a title and message'); return; }

  const btn = document.getElementById('devoSubmitBtn');
  btn.disabled = true;
  const { error } = await sb.from('devotionals').insert({ title, verse, verse_ref: verseRef, body });
  btn.disabled = false;
  if (error) { console.error(error); showToast('Something went wrong: ' + error.message); return; }

  document.getElementById('devoTitle').value = '';
  document.getElementById('devoVerse').value = '';
  document.getElementById('devoVerseRef').value = '';
  document.getElementById('devoBody').value = '';
  showToast('Devotional posted successfully');
  renderDevoList();
  renderOverview();
}

async function deleteDevotional(id) {
  if (!confirmDelete()) return;
  const { error } = await sb.from('devotionals').delete().eq('id', id);
  if (error) { showToast('Error deleting: ' + error.message); return; }
  renderDevoList();
  renderOverview();
  showToast('Devotional deleted');
}

async function renderDevoList() {
  const container = document.getElementById('devoList');
  if (!container) return;
  const { data, error } = await sb.from('devotionals').select('*').order('created_at', { ascending: false });
  if (error) { container.innerHTML = `<div class="empty-state">Unable to load devotionals.</div>`; return; }
  if (!data.length) { container.innerHTML = `<div class="empty-state">No devotionals posted yet.</div>`; return; }
  container.innerHTML = data.map(d => `
    <div class="list-item">
      <div class="list-item-head">
        <div>
          <div class="list-item-title">${escapeHtml(d.title)}</div>
          <div class="list-item-meta">${formatDate(d.created_at)}</div>
        </div>
      </div>
      <div class="list-item-body">${escapeHtml(d.body).slice(0, 200)}${d.body.length > 200 ? '…' : ''}</div>
      <div class="list-item-actions">
        <button class="btn btn-red btn-sm" onclick="deleteDevotional('${d.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   SERMONS
   ============================================================ */
async function postSermon() {
  const title = document.getElementById('sermonTitle').value.trim();
  const category = document.getElementById('sermonCategory').value.trim();
  const youtubeUrl = document.getElementById('sermonUrl').value.trim();
  if (!title || !youtubeUrl) { showToast('Please enter a title and YouTube link'); return; }
  if (!extractYouTubeId(youtubeUrl)) { showToast('That does not look like a valid YouTube link'); return; }

  const btn = document.getElementById('sermonSubmitBtn');
  btn.disabled = true;
  const { error } = await sb.from('sermons').insert({ title, category, youtube_url: youtubeUrl });
  btn.disabled = false;
  if (error) { console.error(error); showToast('Something went wrong: ' + error.message); return; }

  document.getElementById('sermonTitle').value = '';
  document.getElementById('sermonCategory').value = '';
  document.getElementById('sermonUrl').value = '';
  showToast('Sermon added successfully');
  renderSermonList();
  renderOverview();
}

async function deleteSermon(id) {
  if (!confirmDelete()) return;
  const { error } = await sb.from('sermons').delete().eq('id', id);
  if (error) { showToast('Error deleting: ' + error.message); return; }
  renderSermonList();
  renderOverview();
  showToast('Sermon deleted');
}

async function renderSermonList() {
  const container = document.getElementById('sermonList');
  if (!container) return;
  const { data, error } = await sb.from('sermons').select('*').order('created_at', { ascending: false });
  if (error) { container.innerHTML = `<div class="empty-state">Unable to load sermons.</div>`; return; }
  if (!data.length) { container.innerHTML = `<div class="empty-state">No sermons added yet.</div>`; return; }
  container.innerHTML = data.map(s => `
    <div class="list-item">
      <div class="list-item-head">
        <div>
          <div class="list-item-title">${escapeHtml(s.title)}</div>
          <div class="list-item-meta">${escapeHtml(s.category || 'Teaching')} &middot; ${formatDate(s.created_at)}</div>
        </div>
      </div>
      <div class="list-item-actions">
        <a href="${escapeHtml(s.youtube_url)}" target="_blank" class="btn btn-outline btn-sm">View on YouTube</a>
        <button class="btn btn-red btn-sm" onclick="deleteSermon('${s.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   EVENTS
   ============================================================ */
async function postEvent() {
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value.trim();
  const location = document.getElementById('eventLocation').value.trim();
  const description = document.getElementById('eventDesc').value.trim();
  if (!title || !date) { showToast('Please enter a title and date'); return; }

  const btn = document.getElementById('eventSubmitBtn');
  btn.disabled = true;
  const { error } = await sb.from('events').insert({
    title, event_date: date, event_time: time, location, description
  });
  btn.disabled = false;
  if (error) { console.error(error); showToast('Something went wrong: ' + error.message); return; }

  document.getElementById('eventTitle').value = '';
  document.getElementById('eventDate').value = '';
  document.getElementById('eventTime').value = '';
  document.getElementById('eventLocation').value = '';
  document.getElementById('eventDesc').value = '';
  showToast('Event added successfully');
  renderEventList();
  renderOverview();
}

async function deleteEvent(id) {
  if (!confirmDelete()) return;
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) { showToast('Error deleting: ' + error.message); return; }
  renderEventList();
  renderOverview();
  showToast('Event deleted');
}

async function renderEventList() {
  const container = document.getElementById('eventList');
  if (!container) return;
  const { data, error } = await sb.from('events').select('*').order('event_date', { ascending: true });
  if (error) { container.innerHTML = `<div class="empty-state">Unable to load events.</div>`; return; }
  if (!data.length) { container.innerHTML = `<div class="empty-state">No events added yet.</div>`; return; }
  container.innerHTML = data.map(ev => `
    <div class="list-item">
      <div class="list-item-head">
        <div>
          <div class="list-item-title">${escapeHtml(ev.title)}</div>
          <div class="list-item-meta">${formatDate(ev.event_date)}${ev.event_time ? ' &middot; ' + escapeHtml(ev.event_time) : ''}${ev.location ? ' &middot; ' + escapeHtml(ev.location) : ''}</div>
        </div>
      </div>
      ${ev.description ? `<div class="list-item-body">${escapeHtml(ev.description)}</div>` : ''}
      <div class="list-item-actions">
        <button class="btn btn-red btn-sm" onclick="deleteEvent('${ev.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   REGISTRATIONS
   ============================================================ */
async function deleteRegistration(id) {
  if (!confirmDelete()) return;
  const { error } = await sb.from('registrations').delete().eq('id', id);
  if (error) { showToast('Error deleting: ' + error.message); return; }
  renderRegistrations();
  renderOverview();
  showToast('Registration removed');
}

async function renderRegistrations() {
  const wrap = document.getElementById('regTableWrap');
  if (!wrap) return;
  const { data, error } = await sb.from('registrations').select('*').order('created_at', { ascending: false });
  if (error) { wrap.innerHTML = `<div class="empty-state">Unable to load registrations.</div>`; return; }
  if (!data.length) { wrap.innerHTML = `<div class="empty-state">No registrations yet.</div>`; return; }
  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Event</th><th>Date</th><th></th></tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.phone)}</td>
              <td>${escapeHtml(r.event_title)}</td>
              <td>${timeAgo(r.created_at)}</td>
              <td><button class="btn btn-red btn-sm" onclick="deleteRegistration('${r.id}')">Remove</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   COMMUNITY MODERATION
   ============================================================ */
async function deleteWallPost(id) {
  if (!confirmDelete('Delete this post from the community wall?')) return;
  const { error } = await sb.from('wall_posts').delete().eq('id', id);
  if (error) { showToast('Error deleting: ' + error.message); return; }
  renderWallModeration();
  renderOverview();
  showToast('Post removed');
}

async function renderWallModeration() {
  const container = document.getElementById('wallModerationList');
  if (!container) return;
  const { data, error } = await sb.from('wall_posts').select('*').order('created_at', { ascending: false });
  if (error) { container.innerHTML = `<div class="empty-state">Unable to load posts.</div>`; return; }
  if (!data.length) { container.innerHTML = `<div class="empty-state">No community posts yet.</div>`; return; }
  const typeLabels = { prayer: 'Prayer Request', testimony: 'Testimony', word: 'A Word' };
  container.innerHTML = data.map(p => `
    <div class="list-item">
      <div class="list-item-head">
        <div>
          <div class="list-item-title">${escapeHtml(p.name)} <span class="badge badge-${p.type}">${typeLabels[p.type] || p.type}</span></div>
          <div class="list-item-meta">${timeAgo(p.created_at)}</div>
        </div>
      </div>
      <div class="list-item-body">${escapeHtml(p.message)}</div>
      <div class="list-item-actions">
        <button class="btn btn-red btn-sm" onclick="deleteWallPost('${p.id}')">Delete Post</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   MEMBERS REGISTRY (private, admin-auth-only)
   ============================================================ */
async function addMember() {
  const name = document.getElementById('memberName').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const branch = document.getElementById('memberBranch').value.trim();
  const address = document.getElementById('memberAddress').value.trim();
  if (!name || !phone) { showToast('Please enter name and phone number'); return; }

  const btn = document.getElementById('memberSubmitBtn');
  btn.disabled = true;
  const { error } = await sb.from('members').insert({ name, phone, branch, address });
  btn.disabled = false;
  if (error) { console.error(error); showToast('Something went wrong: ' + error.message); return; }

  document.getElementById('memberName').value = '';
  document.getElementById('memberPhone').value = '';
  document.getElementById('memberBranch').value = '';
  document.getElementById('memberAddress').value = '';
  showToast('Member added to registry');
  renderMembers();
  renderOverview();
}

async function deleteMember(id) {
  if (!confirmDelete('Remove this member from the registry?')) return;
  const { error } = await sb.from('members').delete().eq('id', id);
  if (error) { showToast('Error deleting: ' + error.message); return; }
  renderMembers();
  renderOverview();
  showToast('Member removed');
}

async function renderMembers() {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;
  const { data, error } = await sb.from('members').select('*').order('name', { ascending: true });
  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Unable to load members.</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;font-style:italic;">No members added yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.phone)}</td>
      <td>${escapeHtml(m.address || '—')}</td>
      <td>${escapeHtml(m.branch || '—')}</td>
      <td><button class="btn btn-red btn-sm" onclick="deleteMember('${m.id}')">Remove</button></td>
    </tr>
  `).join('');
}

/* ============================================================
   OVERVIEW STATS
   ============================================================ */
async function renderOverview() {
  const [devos, sermons, events, members, regs, wall] = await Promise.all([
    sb.from('devotionals').select('id', { count: 'exact', head: true }),
    sb.from('sermons').select('id', { count: 'exact', head: true }),
    sb.from('events').select('id', { count: 'exact', head: true }),
    sb.from('members').select('id', { count: 'exact', head: true }),
    sb.from('registrations').select('id', { count: 'exact', head: true }),
    sb.from('wall_posts').select('id', { count: 'exact', head: true })
  ]);
  if (document.getElementById('statDevos')) document.getElementById('statDevos').textContent = devos.count ?? 0;
  if (document.getElementById('statSermons')) document.getElementById('statSermons').textContent = sermons.count ?? 0;
  if (document.getElementById('statEvents')) document.getElementById('statEvents').textContent = events.count ?? 0;
  if (document.getElementById('statMembers')) document.getElementById('statMembers').textContent = members.count ?? 0;
  if (document.getElementById('statRegs')) document.getElementById('statRegs').textContent = regs.count ?? 0;
  if (document.getElementById('statWall')) document.getElementById('statWall').textContent = wall.count ?? 0;
}

function refreshAll() {
  renderOverview();
  renderDevoList();
  renderSermonList();
  renderEventList();
  renderRegistrations();
  renderWallModeration();
  renderMembers();
}
