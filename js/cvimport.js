// ── CV IMPORT ───────────────────────────────────────────
// Upload a CV (PDF, Word .docx or text) in the Profile tab. The text is
// extracted in the browser, rearranged into the profile's CV-body format
// (by the local model if Ollama is running, otherwise by simple rules),
// and loaded into the Profile form for review. Nothing is saved until
// you click Save Profile.

const CV_LIBS = {
  pdf:  { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', global: 'pdfjsLib',
          worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' },
  docx: { src: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', global: 'mammoth' }
};

function loadScriptOnce({ src, global }) {
  if (window[global]) return Promise.resolve(window[global]);
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => window[global] ? resolve(window[global]) : reject(new Error(`${global} didn't load`));
    el.onerror = () => reject(new Error('Couldn\'t download the file reader — check your internet connection'));
    document.head.appendChild(el);
  });
}

// Rebuild reading-order lines from pdf.js text items (handles right-aligned
// dates/locations, which come out as separate items on the same line)
function pdfItemsToLines(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || 10;
    let row = rows.find(r => Math.abs(r.y - y) <= Math.max(2, h * 0.3));
    if (!row) { row = { y, h, parts: [] }; rows.push(row); }
    row.parts.push({ x, w: it.width || 0, str: it.str, h });
  }
  rows.sort((a, b) => b.y - a.y);
  const lines = [];
  let prev = null;
  for (const r of rows) {
    r.parts.sort((a, b) => a.x - b.x);
    let text = '', end = null;
    for (const part of r.parts) {
      if (end !== null) {
        const gap = part.x - end;
        if (gap > part.h * 4) text += ' | ';             // far apart: column gap (e.g. right-aligned date)
        else if (gap > part.h * 0.15 && !/\s$/.test(text) && !/^\s/.test(part.str)) text += ' ';
      }
      text += part.str;
      end = part.x + part.w;
    }
    if (prev && prev.y - r.y > Math.max(prev.h, r.h) * 2.1) lines.push('');  // paragraph gap
    lines.push(text.trim());
    prev = r;
  }
  return lines;
}

async function extractCVText(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let text;
  if (ext === 'pdf') {
    const pdfjs = await loadScriptOnce(CV_LIBS.pdf);
    pdfjs.GlobalWorkerOptions.workerSrc = CV_LIBS.pdf.worker;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const lines = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      lines.push(...pdfItemsToLines((await page.getTextContent()).items), '');
    }
    text = lines.join('\n');
  } else if (ext === 'docx') {
    const mammoth = await loadScriptOnce(CV_LIBS.docx);
    const html = (await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value;
    text = docxHtmlToText(html);
  } else if (ext === 'doc') {
    throw new Error('Old .doc files aren\'t supported — save it as .docx or PDF and try again');
  } else {
    text = await file.text();
  }
  text = text
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .replace(/^[ \t]*[●•▪◦■□➢►✓]\s*/gm, '- ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 80) throw new Error('Couldn\'t find any text in that file — if it\'s a scanned image, export it as a text PDF or .docx');
  return text;
}

// Word → HTML → text: list items become "- " bullets, table cells on a row are joined with " | "
function docxHtmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines = [];
  const walk = node => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'table') {
        for (const tr of el.querySelectorAll('tr')) {
          const cells = [...tr.children].map(td => td.textContent.trim()).filter(Boolean);
          // a cell may hold several paragraphs/bullets — keep those as their own lines
          const multi = [...tr.children].some(td => td.querySelectorAll('p, li').length > 1);
          if (multi) walk(tr); else if (cells.length) lines.push(cells.join(' | '));
        }
      } else if (tag === 'ul' || tag === 'ol') {
        el.querySelectorAll(':scope > li').forEach(li => lines.push('- ' + li.textContent.trim()));
      } else if (/^(p|h[1-6])$/.test(tag)) {
        const t = el.textContent.trim();
        if (t) { if (/^h/.test(tag) && lines.length) lines.push(''); lines.push(t); }
      } else {
        walk(el);
      }
    }
  };
  walk(doc.body);
  return lines.join('\n');
}

// ── Pull contact details, name and summary straight from the text ──
function extractCVDetails(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const all = raw.replace(/\s*\|\s*/g, ' | ');
  const d = {};
  const first = lines[0] || '';
  if (first && !/[@\d|]/.test(first) && first.split(/\s+/).length <= 5) {
    d.name = first.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  d.email = (all.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0];
  d.linkedin = (all.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i) || [])[0]?.replace(/^https?:\/\/(www\.)?/i, '');
  d.github = (all.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i) || [])[0]?.replace(/^https?:\/\/(www\.)?/i, '');
  const phones = (all.match(/\+?\d[\d ()-]{7,}\d/g) || []).map(p => p.trim()).filter(p => p.replace(/\D/g, '').length >= 9);
  if (phones.length) d.phone = [...new Set(phones)].join(' / ');
  const head = lines.slice(0, 6).join(' ');
  const sites = (head.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/[\w./-]*)?/gi) || [])
    .filter(u => !/linkedin\.com|github\.com|@/i.test(u) && !(d.email || '').includes(u) && /[a-z]/i.test(u) && /\.[a-z]{2,}/i.test(u));
  if (sites.length) d.website = sites[0].replace(/^https?:\/\/(www\.)?/i, '');

  // First bullet/sentence of a SUMMARY / PROFILE section → intro bullet
  const sIdx = lines.findIndex(l => /^(summary|profile|professional summary|personal statement|about me)$/i.test(l.replace(/[^A-Za-z ]/g, '').trim()));
  if (sIdx >= 0) {
    const chunk = [];
    for (const l of lines.slice(sIdx + 1)) {
      if (CV_HEADINGS.some(h => h.re.test(l))) break;
      if (/^- /.test(l) && chunk.length) break;  // stop at the second bullet
      chunk.push(l.replace(/^- /, ''));
    }
    if (chunk.length) d.intro = chunk.join(' ').replace(/\s+/g, ' ').trim();
  }
  return d;
}

const CV_HEADINGS = [
  { name: 'EDUCATION', re: /^(education|education and qualifications|qualifications)$/i },
  { name: 'WORK EXPERIENCE', re: /^(work experience|experience|professional experience|employment|employment history|work history)$/i },
  { name: 'PROJECTS', re: /^(projects|personal projects|university and personal projects|academic projects|key projects|selected projects)$/i },
  { name: 'TECHNICAL SKILLS', re: /^(technical skills|skills|key skills|additional|additional information|skills and interests)$/i },
  { name: 'SUMMARY', re: /^(summary|profile|professional summary|personal statement|about me)$/i }
].map(h => ({ ...h, re: new RegExp(h.re.source.replace('^(', '^\\s*(').replace(')$', ')\\s*:?\\s*$'), 'i') }));

// "UNIVERSITY OF EXETER" → "University of Exeter" (acronyms like UK / AI stay as they are)
const KEEP_CAPS = new Set(['UK','US','USA','EU','AI','ML','API','APIS','SQL','CV','QA','IT','HR','UX','UI','NHS','BI','GCP','AWS','PHP','CSS','HTML','CMS','ETL','LLM','NLP','IOT','SAAS','GMP','BSC','MSC','PHD','MBA','CEO','CTO']);
function tidyCaps(s) {
  if (s !== s.toUpperCase() || !/[A-Z]{4}/.test(s)) return s;
  const small = new Set(['and', 'of', 'the', 'for', 'in', 'on', 'with', 'a', 'an', 'to', 'at', 'by']);
  return s.split(' ').map((w, i) => w.split('-').map(part => {
    const lw = part.toLowerCase();
    if (i > 0 && small.has(lw)) return lw;
    if (KEEP_CAPS.has(part.replace(/[^A-Z]/g, ''))) return part;  // UK, AI, SQL
    return lw.replace(/^([^a-z]*)([a-z])/, (m, pre, c) => pre + c.toUpperCase());
  }).join('-')).join(' ');
}

// "REAL - TIME" is a hyphenated word, "Tetris - JavaScript" is a separator
function joinStrayHyphens(s) {
  return s.replace(/(\S+) - (\S+)/g, (m, a, b) =>
    TECH_TERMS.some(t => t.length > 1 && hasTag(b.toLowerCase(), t)) ? `${a} — ${b}` : `${a}-${b}`);
}

// ── Rule-based conversion (used when no model is available) ──
function ruleConvertCV(raw) {
  const lines = raw.split('\n').map(l => l.trim());
  const out = [];
  let section = null, pending = [];
  const split = l => { const [left, ...rest] = l.split(/\s*\|\s*/); return { left: left.trim(), right: rest.join(' | ').trim() }; };
  const isDate = s => /\b(19|20)\d{2}\b|current|present/i.test(s);
  const flush = () => {
    if (!pending.length) return;
    if (pending.length >= 2 && (section === 'WORK EXPERIENCE' || section === 'EDUCATION')) {
      // e.g. "COMPANY | Location" + "Job Title | Period"  →  "Job Title — Company, Location | Period"
      const a = split(tidyCaps(pending[0])), b = split(tidyCaps(pending[1]));
      const org = a.left + (a.right && !isDate(a.right) ? ', ' + a.right : '');
      const period = b.right || (isDate(a.right) ? a.right : '');
      out.push(section === 'EDUCATION'
        ? `${b.left} — ${org}${period ? ' (' + period + ')' : ''}`
        : `${b.left} — ${org}${period ? ' | ' + period : ''}`);
      pending.slice(2).forEach(l => out.push(section === 'EDUCATION' ? '- ' + l : l));
    } else {
      pending.forEach(l => {
        const s2 = split(l);
        out.push(section === 'PROJECTS' ? joinStrayHyphens(tidyCaps(s2.left)) + (s2.right ? ' — ' + s2.right : '') : tidyCaps(l));
      });
    }
    pending = [];
  };
  for (const l of lines) {
    const h = CV_HEADINGS.find(h => h.re.test(l));
    if (h) { flush(); section = h.name; if (section !== 'SUMMARY') out.push('', section); continue; }
    if (!section || section === 'SUMMARY') continue;  // name/contacts/summary handled separately
    if (!l) { flush(); continue; }
    if (/^- /.test(l)) { flush(); out.push(l); continue; }
    if (section === 'TECHNICAL SKILLS') { out.push(l); continue; }
    // Continuation of a wrapped bullet
    if (!pending.length && out.length && /^- /.test(out[out.length - 1]) && /^[a-z(]/.test(l)) { out[out.length - 1] += ' ' + l; continue; }
    // A new header line straight after bullets starts a new entry
    pending.push(l);
  }
  flush();
  // Insert blank lines between entries for readability
  const res = [];
  out.forEach((l, i) => {
    if (l && !/^- /.test(l) && i > 0 && /^- /.test(out[i - 1]) && !CV_HEADINGS.some(h => h.name === l)) res.push('');
    res.push(l);
  });
  return res.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Model conversion ──
async function modelConvertCV(raw) {
  const prompt = `Rearrange this CV into the exact plain-text format below.
Copy the wording EXACTLY as written. Do NOT rewrite, summarise, improve, add or remove any facts, numbers, skills, dates or bullet points. Only move text into the format.

FORMAT:
EDUCATION
Degree — Institution (Years)
- detail line

WORK EXPERIENCE
Job Title — Company, Location | Period
- bullet

PROJECTS
Project Name — tech stack if the CV states one
- bullet

TECHNICAL SKILLS
Category: item, item, item

RULES:
- Leave out the person's name, contact details and any SUMMARY / PROFILE section.
- Every bullet on its own line starting with "- ". Join bullets that wrap onto several lines.
- Put any other sections (languages, certifications, interests) as lines under TECHNICAL SKILLS.
- Plain text only. No markdown, no commentary.

CV:
${raw}`;
  const d = await callLLM(prompt, 3000, { kind: 'cvimport' });
  let text = extractText(d).replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
  text = text.slice(Math.max(0, text.search(/^EDUCATION|^WORK EXPERIENCE/m)));
  const found = ['EDUCATION', 'WORK EXPERIENCE', 'PROJECTS', 'TECHNICAL SKILLS'].filter(h => new RegExp('^' + h + '\\s*$', 'm').test(text));
  if (found.length < 2) throw new Error('model output was not in the expected format');
  return text;
}

// Skills section → comma-separated summary used for job scoring
function skillsSummaryFrom(cvBody) {
  const lines = cvBody.split('\n');
  const start = lines.findIndex(l => /^TECHNICAL SKILLS\s*$/.test(l.trim()));
  if (start < 0) return '';
  const out = [];
  for (const l of lines.slice(start + 1)) {
    if (/^(EDUCATION|WORK EXPERIENCE|PROJECTS|SUMMARY)\s*$/.test(l.trim())) break;
    const t = l.replace(/^- /, '').replace(/^[^:]{1,40}:\s*/, '').trim();
    if (t) out.push(t.replace(/[.;]$/, ''));
  }
  return out.join(', ');
}

async function importCVFile(input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const box = document.getElementById('importResult');
  const err = document.getElementById('profileError');
  err.classList.remove('visible');
  box.style.display = 'none';
  try {
    setLoading(true, 'Reading your CV...', file.name);
    const raw = await extractCVText(file);
    const details = extractCVDetails(raw);

    let cvBody, how;
    const useModel = !DEMO.active && ollamaStatus === 'ok';
    if (useModel) {
      setLoadingText(`Formatting with ${modelLabel()}...`, 'this can take a minute');
      try { cvBody = await modelConvertCV(raw); how = `formatted by ${ollamaModel}`; }
      catch (e) { console.warn('Model conversion failed, using rules', e); }
    }
    if (!cvBody) { cvBody = ruleConvertCV(raw); how = useModel ? 'model output was unusable, so it was formatted by simple rules' : 'formatted by simple rules (start Ollama for a smarter conversion)'; }
    setLoading(false);

    // Fill the form — nothing is saved until "Save Profile"
    const set = (id, v) => { if (v) document.getElementById(id).value = v; };
    set('pf-name', details.name); set('pf-phone', details.phone); set('pf-email', details.email);
    set('pf-github', details.github); set('pf-linkedin', details.linkedin); set('pf-website', details.website);
    set('pf-intro', details.intro);
    set('pf-cv', cvBody);
    const skills = skillsSummaryFrom(cvBody);
    if (skills) set('pf-scoring', skills);

    // Check the conversion against the original file
    const flags = findUnsupported(cvBody, [], raw);
    // Compare against the original minus the name, contacts and summary (those don't go in the CV body)
    const rawLines = raw.split('\n');
    const firstBody = rawLines.findIndex(l => CV_HEADINGS.some(h => h.name !== 'SUMMARY' && h.re.test(l.trim())));
    let inSummary = false;
    const rawBody = rawLines.slice(Math.max(0, firstBody)).filter(l => {
      const h = CV_HEADINGS.find(h => h.re.test(l.trim()));
      if (h) inSummary = h.name === 'SUMMARY';
      return !inSummary;
    }).join('\n');
    const words = s => (s.match(/[A-Za-z]{3,}/g) || []).length;
    const ratio = words(cvBody) / Math.max(1, words(rawBody));
    const warnings = [];
    if (flags.length) warnings.push(`These aren't in your original CV — remove them: ${flags.map(f => '<span class="fc-chip">' + fcEscapeHTML(f.text) + '</span>').join('')}`);
    if (ratio < 0.75) warnings.push(`The converted CV is noticeably shorter than the original (${Math.round(ratio * 100)}% of the words) — check nothing was dropped.`);

    box.className = 'factcheck visible ' + (warnings.length ? 'warn' : 'ok');
    box.style.display = 'block';
    box.innerHTML = `<div class="fc-title" style="color:${warnings.length ? 'var(--warn)' : 'var(--success)'}">${warnings.length ? '⚠' : '✓'} Imported ${fcEscapeHTML(file.name)} — review, then Save Profile</div>
      <div style="color:var(--muted)">CV body ${how}. Contact details${details.intro ? ', intro bullet' : ''} and the skills summary were filled in where found.
      Your cover letter template and tailoring rules weren't changed — update them below if your experience has changed.</div>
      ${warnings.map(w => `<div style="margin-top:8px;">${w}</div>`).join('')}
      <div class="fc-note">Nothing is saved yet. Click Save Profile to keep it, or switch tabs and come back to discard it.</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    setLoading(false);
    err.textContent = 'Couldn\'t import that CV: ' + (e.message || e);
    err.classList.add('visible');
    console.error(e);
  }
}
