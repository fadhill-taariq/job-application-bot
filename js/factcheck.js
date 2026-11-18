// ── FACT CHECK ──────────────────────────────────────────
// Local models sometimes "improve" a CV by adding things you never wrote —
// a tool you haven't used, a bigger number, a certification. This compares
// the generated text against everything in your profile and flags:
//   • numbers that don't appear anywhere in your profile
//   • technologies / tools that don't appear anywhere in your profile
// It can't catch every reworded claim, so it's a prompt to check, not a guarantee.

const TECH_TERMS = [
  // languages
  'python','java','javascript','typescript','c','c++','c#','go','golang','rust','ruby','php','kotlin','swift','scala','r','matlab','perl','bash','powershell','sql','nosql','html','css','sass','dart','elixir','haskell','lua','objective-c','vba','solidity',
  // frameworks / libraries
  'django','flask','fastapi','spring','spring boot','express','node','node.js','react','react native','angular','vue','vue.js','svelte','next.js','nuxt','jquery','bootstrap','tailwind','laravel','rails','ruby on rails','.net','asp.net','dotnet','pandas','numpy','scipy','scikit-learn','sklearn','tensorflow','pytorch','keras','matplotlib','seaborn','plotly','spark','pyspark','hadoop','kafka','airflow','dbt','graphql','redux','jest','pytest','junit','selenium','cypress','playwright','unity','unreal',
  // data / storage
  'mysql','postgresql','postgres','sqlite','mongodb','redis','elasticsearch','dynamodb','cassandra','oracle','sql server','snowflake','bigquery','redshift','databricks','firebase','supabase','tableau','power bi','looker','excel',
  // cloud / devops
  'aws','azure','gcp','google cloud','ec2','s3','lambda','cloudformation','terraform','ansible','docker','kubernetes','k8s','helm','jenkins','github actions','gitlab','ci/cd','circleci','nginx','apache','linux','unix','heroku','vercel','netlify','openshift','vertex','sagemaker',
  // other tools / practices
  'git','jira','confluence','figma','sanity','sanity.io','groq','wordpress','shopify','salesforce','sap','servicenow','agile','scrum','kanban','tdd','microservices','grpc','websockets','oauth','jwt','llm','nlp','computer vision','blockchain','iso 9001','itil','prince2','six sigma'
];

// Capitalised words that aren't claims (avoid noisy flags)
const FC_STOPWORDS = new Set(['i','cv','uk','us','usa','eu','hr','ok','pdf','ceo','cto','ltd','plc','llc','am','pm','re','dear','faq',
  // section headings
  'summary','profile','education','work','experience','projects','project','technical','skills','additional','key','languages']);

function factSourceText(p = profile) {
  const s = p.summary || {};
  const pools = [...(s.stackVariants || []), ...(s.cloudVariants || []), ...(s.conditional || [])].map(v => v.text);
  return [p.name, p.phone, p.email, p.github, p.linkedin, p.website, p.scoringSummary, s.intro, s.softSkills, ...pools, p.cvBody, p.coverTemplate]
    .filter(Boolean).join('\n');
}

function fcNormNum(n) { return n.replace(/[,\s%]/g, '').replace(/\.0+$/, ''); }

function fcLooksTech(w) {
  return /[a-z][A-Z]/.test(w)              // CamelCase: PostgreSQL, TensorFlow, GitHub
      || /\.(js|io|net|ts)$/i.test(w)      // Vue.js, Sanity.io
      || /[+#]/.test(w)                    // C++, C#
      || /^[A-Z]{2,6}s?$/.test(w);         // AWS, CI, APIs
}

// Returns [{ text, kind }] for things in `output` not supported by the profile.
// `ignore` = extra words that are fine (company name, role title).
function findUnsupported(output, ignore = [], sourceText = null) {
  const src = sourceText ?? factSourceText();
  const srcLower = src.toLowerCase();
  const outLower = output.toLowerCase();
  const ignoreLower = ignore.filter(Boolean).join(' ').toLowerCase();
  const NUM_RE = /(?<![A-Za-z\d])\d[\d,]*(?:\.\d+)?%?(?![A-Za-z\d])/g; // standalone numbers, not '5S'
  const srcNums = new Set((src.match(NUM_RE) || []).map(fcNormNum));
  const found = new Map();

  // 1. Numbers not in the profile
  for (const m of output.matchAll(NUM_RE)) {
    const n = fcNormNum(m[0]);
    if (!n || srcNums.has(n) || ignoreLower.includes(n)) continue;
    found.set(m[0].replace(/,$/, ''), 'number');
  }

  // 2. Known technologies not in the profile
  for (const t of TECH_TERMS) {
    if (t.length < 2) continue; // 'c' / 'r' are too ambiguous to flag
    if (hasTag(outLower, t) && !hasTag(srcLower, t) && !hasTag(srcLower, t + 's') && !hasTag(ignoreLower, t)) {
      // show it the way it's written in the output (AWS, not aws)
      const at = outLower.search(new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])'));
      const start = at + (outLower[at] === t[0] ? 0 : 1);
      found.set(output.slice(start, start + t.length), 'tech');
    }
  }

  // 3. Tech-looking words not in the profile (catches tools not on the list)
  for (const m of output.matchAll(/[A-Za-z][A-Za-z0-9+#./-]*[A-Za-z0-9+#]/g)) {
    const w = m[0].replace(/[./-]+$/, '');
    const wl = w.toLowerCase();
    if (FC_STOPWORDS.has(wl) || !fcLooksTech(w)) continue;
    const singular = wl.replace(/s$/, '');
    if (srcLower.includes(wl) || srcLower.includes(singular) || ignoreLower.includes(wl)) continue;
    if ([...found.keys()].some(k => k.toLowerCase() === wl)) continue;
    found.set(w, 'term');
  }

  // 4. Template blanks the model didn't fill in
  if (/_{3,}/.test(output)) found.set('____', 'blank');

  return [...found].map(([text, kind]) => ({ text, kind }));
}

function fcEscapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// Render `text` into `el` with flagged items highlighted
function renderWithFlags(el, text, flags) {
  if (!flags.length) { el.textContent = text; return; }
  const alts = flags.map(f => f.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const re = new RegExp('(^|[^A-Za-z0-9_])(' + alts.join('|') + '_*)(?![A-Za-z0-9])', 'gi');
  let html = '', last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index + m[1].length;
    html += fcEscapeHTML(text.slice(last, start)) + '<mark class="fc-flag">' + fcEscapeHTML(m[2]) + '</mark>';
    last = start + m[2].length;
  }
  el.innerHTML = html + fcEscapeHTML(text.slice(last));
}

function renderFactPanel(cvFlags, coverFlags) {
  const panel = document.getElementById('factCheck');
  panel.classList.add('visible');
  const all = new Map();
  cvFlags.forEach(f => all.set(f.text.toLowerCase(), { ...f, where: 'CV' }));
  coverFlags.forEach(f => {
    const k = f.text.toLowerCase();
    all.set(k, all.has(k) ? { ...all.get(k), where: 'CV + cover letter' } : { ...f, where: 'cover letter' });
  });
  if (!all.size) {
    panel.className = 'factcheck visible ok';
    panel.innerHTML = '✓ Fact check: no numbers or technologies found that aren\'t in your profile.';
    return;
  }
  panel.className = 'factcheck visible warn';
  const chips = [...all.values()].map(f =>
    `<span class="fc-chip" title="In the ${f.where}">${f.kind === 'blank' ? 'unfilled blank ____' : fcEscapeHTML(f.text)}</span>`).join('');
  panel.innerHTML = `<div class="fc-title">⚠ ${all.size} thing${all.size !== 1 ? 's' : ''} not in your profile — check before sending</div>
    ${chips}
    <div class="fc-note">Highlighted in the text below. Remove them if they aren't true, or add them to your Profile if they are. This catches new numbers and tech names, not every reworded claim.</div>`;
}

function runFactCheck({ highlight = false } = {}) {
  const ignore = [document.getElementById('companyInput').value, document.getElementById('roleInput').value];
  const cvEl = document.getElementById('cvOutput'), coverEl = document.getElementById('coverOutput');
  const cvText = cvEl.innerText, coverText = coverEl.innerText;
  const cvFlags = findUnsupported(cvText, ignore);
  const coverFlags = findUnsupported(coverText, ignore);
  if (highlight) {
    renderWithFlags(cvEl, cvText, cvFlags);
    renderWithFlags(coverEl, coverText, coverFlags);
  }
  renderFactPanel(cvFlags, coverFlags);
}

let _fcTimer = null;
function scheduleFactCheck() {
  clearTimeout(_fcTimer);
  _fcTimer = setTimeout(() => runFactCheck({ highlight: false }), 600);
}
