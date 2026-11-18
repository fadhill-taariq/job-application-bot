// ── LIVE JOB SEARCH (JSearch via RapidAPI) ──────────────
// JSearch reads Google for Jobs (LinkedIn, Indeed, Glassdoor, company sites…).
// Your RapidAPI key is kept in this browser only (localStorage) — it is never
// part of the profile export and never written into the code.
// Get a free key: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

const JSEARCH_KEY = 'jsearch_api_key';
const JSEARCH_URL = 'https://jsearch.p.rapidapi.com/search';

function getJSearchKey() {
  try { return (localStorage.getItem(JSEARCH_KEY) || '').trim(); } catch { return ''; }
}
function setJSearchKey(k) {
  if (k) localStorage.setItem(JSEARCH_KEY, k.trim()); else localStorage.removeItem(JSEARCH_KEY);
}

const EMPLOYMENT_LABELS = { FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract', INTERN: 'Internship', TEMPORARY: 'Temporary' };

function formatJSearchSalary(j) {
  if (j.job_salary_string) return j.job_salary_string;
  const min = j.job_min_salary, max = j.job_max_salary;
  if (!min && !max) return 'Salary not listed';
  const cur = { GBP: '£', EUR: '€', USD: '$' }[j.job_salary_currency] || (j.job_salary_currency ? j.job_salary_currency + ' ' : '');
  const fmt = n => cur + Math.round(n).toLocaleString('en-GB');
  const per = { YEAR: '/yr', MONTH: '/mo', HOUR: '/hr' }[j.job_salary_period] || '';
  return (min && max && min !== max ? `${fmt(min)}–${fmt(max)}` : fmt(min || max)) + per;
}

function mapJSearchJob(j, i) {
  const place = [j.job_city, j.job_country].filter(Boolean).join(', ');
  return {
    id: 1000 + i,                         // numeric, used by loadJob()
    title: j.job_title || 'Untitled role',
    company: j.employer_name || 'Unknown company',
    location: j.job_is_remote ? (place ? `Remote · ${place}` : 'Remote') : (place || 'Location not listed'),
    salary: formatJSearchSalary(j),
    type: (j.job_employment_types || [j.job_employment_type]).filter(Boolean).map(t => EMPLOYMENT_LABELS[t] || t).join(' / ') || 'Not specified',
    source: j.job_publisher || 'JSearch',
    url: j.job_apply_link || j.job_google_link || '#',
    description: (j.job_description || '').replace(/\s+\n/g, '\n').trim() || 'No description provided.',
    posted: j.job_posted_at_datetime_utc || ''
  };
}

// opts: { keywords, location, country, datePosted }
async function fetchJSearchJobs(opts) {
  const key = getJSearchKey();
  if (!key) throw new Error('Add your JSearch API key in the Profile tab first.');
  const query = opts.location ? `${opts.keywords} in ${opts.location}` : opts.keywords;
  const params = new URLSearchParams({ query, page: '1', num_pages: '1', date_posted: opts.datePosted || 'all' });
  if (opts.country) params.set('country', opts.country);

  let r;
  try {
    r = await fetch(`${JSEARCH_URL}?${params}`, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' }
    });
  } catch (e) {
    throw new Error('Couldn\'t reach JSearch — check your internet connection.');
  }
  let body = null;
  try { body = await r.json(); } catch { /* non-JSON error page */ }
  if (!r.ok) {
    const msg = body && (body.message || body.error) || r.statusText;
    if (r.status === 401) throw new Error('Your JSearch key was rejected — check you copied the whole X-RapidAPI-Key in the Profile tab.');
    if (r.status === 403) throw new Error('Your key isn\'t subscribed to JSearch yet — open the JSearch page on RapidAPI and subscribe to the free Basic plan.');
    if (r.status === 429) throw new Error('JSearch limit reached (the free plan allows 200 searches a month). Try again next month or upgrade on RapidAPI.');
    throw new Error(`JSearch error ${r.status}: ${msg}`);
  }
  return ((body && body.data) || []).map(mapJSearchJob);
}

// ── Profile tab: key box ──
function renderJSearchKeyForm() {
  const k = getJSearchKey();
  document.getElementById('pf-jsearch').value = '';
  document.getElementById('pf-jsearch').placeholder = k ? `Saved (…${k.slice(-4)}) — paste a new key to replace it` : 'Paste your X-RapidAPI-Key';
  document.getElementById('pf-jsearch-status').textContent = k ? '✓ Key saved in this browser' : 'No key saved — the Job Scraper shows demo listings';
  document.getElementById('pf-jsearch-status').style.color = k ? 'var(--success)' : 'var(--muted)';
}

function saveJSearchKeyForm() {
  const v = document.getElementById('pf-jsearch').value.trim();
  if (!v) { showToast('Paste your key first', 'error'); return; }
  setJSearchKey(v);
  renderJSearchKeyForm();
  updateSourceSelect();
  showToast('JSearch key saved in this browser ✓', 'success');
}

function removeJSearchKeyForm() {
  setJSearchKey('');
  renderJSearchKeyForm();
  updateSourceSelect();
  showToast('JSearch key removed', 'success');
}

// Scraper: pick live search by default once a key exists
function updateSourceSelect() {
  const sel = document.getElementById('searchSource');
  const live = sel.querySelector('option[value="jsearch"]');
  const hasKey = !!getJSearchKey();
  live.textContent = hasKey ? 'Live jobs (JSearch)' : 'Live jobs (JSearch) — add key in Profile';
  sel.value = hasKey ? 'jsearch' : 'demo';
  updateSearchNotice();
}

function updateSearchNotice() {
  const live = document.getElementById('searchSource').value === 'jsearch';
  document.getElementById('searchCountryWrap').style.opacity = live ? '1' : '0.4';
  document.getElementById('searchPostedWrap').style.opacity = live ? '1' : '0.4';
}
