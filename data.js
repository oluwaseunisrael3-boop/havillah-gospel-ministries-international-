/* ============================================================
   Havilah Gospel Ministries — Supabase Client & Data Layer
   Used by both index.html (public site) and admin.html (dashboard)
   ============================================================ */

const SUPABASE_URL = 'https://viklbkldetxpmrrjraxh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m7PVjzV96FmPa_d2uWpwbg__UQyJez-';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function timeAgo(ts) {
  const time = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   ONE-YEAR BIBLE READING PLAN (KJV) — 365 days
   Generated programmatically to cover the whole Bible in a year,
   spread evenly across OT, NT, Psalms, and Proverbs.
   ============================================================ */

const BIBLE_BOOKS_OT = [
  ['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],
  ['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],
  ['1 Kings',22],['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],['Ezra',10],
  ['Nehemiah',13],['Esther',10],['Job',42],['Proverbs',31],['Ecclesiastes',12],
  ['Song of Solomon',8],['Isaiah',66],['Jeremiah',52],['Lamentations',5],['Ezekiel',48],
  ['Daniel',12],['Hosea',14],['Joel',3],['Amos',9],['Obadiah',1],
  ['Jonah',4],['Micah',7],['Nahum',3],['Habakkuk',3],['Zephaniah',3],
  ['Haggai',2],['Zechariah',14],['Malachi',4]
];
const BIBLE_PSALMS = ['Psalms', 150];
const BIBLE_BOOKS_NT = [
  ['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],
  ['Romans',16],['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],['Ephesians',6],
  ['Philippians',4],['Colossians',4],['1 Thessalonians',5],['2 Thessalonians',3],['1 Timothy',6],
  ['2 Timothy',4],['Titus',3],['Philemon',1],['Hebrews',13],['James',5],
  ['1 Peter',5],['2 Peter',3],['1 John',5],['2 John',1],['3 John',1],
  ['Jude',1],['Revelation',22]
];

function expandBookList(list) {
  const chapters = [];
  list.forEach(([name, count]) => {
    for (let i = 1; i <= count; i++) chapters.push(`${name} ${i}`);
  });
  return chapters;
}

function buildYearPlan() {
  const otChapters = expandBookList(BIBLE_BOOKS_OT);
  const ntChapters = expandBookList(BIBLE_BOOKS_NT);
  const psalmChapters = expandBookList([BIBLE_PSALMS]);
  const otWithoutProverbs = otChapters.filter(c => !c.startsWith('Proverbs '));

  const days = 365;
  const plan = [];
  for (let day = 1; day <= days; day++) {
    const readings = [];

    const otStart = Math.floor(((day - 1) * otWithoutProverbs.length) / days);
    const otEnd = Math.floor((day * otWithoutProverbs.length) / days);
    for (let i = otStart; i < otEnd; i++) readings.push(otWithoutProverbs[i]);
    if (otEnd === otStart && otStart < otWithoutProverbs.length) readings.push(otWithoutProverbs[otStart]);

    const ntStart = Math.floor(((day - 1) * ntChapters.length) / days);
    const ntEnd = Math.floor((day * ntChapters.length) / days);
    for (let i = ntStart; i < ntEnd; i++) readings.push(ntChapters[i]);
    if (ntEnd === ntStart && ntStart < ntChapters.length) readings.push(ntChapters[ntStart]);

    readings.push(psalmChapters[(day - 1) % psalmChapters.length]);

    const provChapter = ((day - 1) % 31) + 1;
    readings.push(`Proverbs ${provChapter}`);

    plan.push(readings);
  }
  return plan;
}

let _cachedPlan = null;
function getYearPlan() {
  if (!_cachedPlan) _cachedPlan = buildYearPlan();
  return _cachedPlan;
}

function getPlanDay(dayNum) {
  const plan = getYearPlan();
  const idx = Math.max(1, Math.min(365, dayNum)) - 1;
  return plan[idx];
}
