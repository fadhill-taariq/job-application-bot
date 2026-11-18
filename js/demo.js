// ── DEMO MODE ───────────────────────────────────────────
// Lets people try the bot without Ollama (e.g. on GitHub Pages).
// The CV summary still uses the real keyword rules from profile.js;
// scoring and the cover letter use simple deterministic stand-ins.
// Turned on by ?demo in the URL, the "Try demo mode" button, or
// automatically when hosted on the web and no local Ollama answers.

const DEMO = { active: false };

function demoRequested() {
  return new URLSearchParams(location.search).has('demo');
}

function isHostedOnWeb() {
  return location.protocol === 'https:' || location.protocol === 'http:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}

function enableDemo() {
  DEMO.active = true;
  document.getElementById('demoBanner').style.display = 'block';
  document.getElementById('ollamaSetup').style.display = 'none';
  document.getElementById('genError').classList.remove('visible');
  document.getElementById('ollamaIndicator').style.background = 'var(--accent)';
  document.getElementById('ollamaLabel').textContent = 'Demo mode';
  document.getElementById('modelSelect').innerHTML = '<option value="demo">demo</option>';
}

// Profile skills as individual terms: "Python, Django, REST APIs, BSc ..." → ['python','django',...]
function demoSkillTerms() {
  return [...new Set(profile.scoringSummary
    .split(/[,.;()]/)
    .map(t => t.trim().replace(/^(and|or)\s+/i, ''))
    .filter(t => t && t.length <= 30 && !/\b(bsc|degree|graduate)\b/i.test(t)))];
}

function demoScore(jd) {
  const jdLower = jd.toLowerCase();
  const matched = demoSkillTerms().filter(t => {
    const parts = t.toLowerCase().split('/').map(x => x.replace(/\s+basics$/, '').trim());
    return parts.some(x => x && hasTag(jdLower, x));
  });
  const score = Math.max(2, Math.min(10, 3 + matched.length));
  const reason = matched.length
    ? `Matches ${matched.length} listed skills incl. ${matched.slice(0, 2).join(', ')}`
    : 'Few of your listed skills appear in this job';
  return { score, reason, scoreReason: reason, keywordsUsed: matched.slice(0, 6) };
}

function demoCoverLetter(jd, company, role) {
  const why = demoScore(jd).keywordsUsed.slice(0, 2);
  const fills = [
    role || 'advertised',
    company || 'your company',
    company || 'your company',
    why.length ? `its work with ${why.join(' and ')}` : 'the work described in the role',
    'your team'
  ];
  let i = 0;
  let text = profile.coverTemplate.trim().replace(/_{3,}/g, () => fills[i++] || '[fill in]');
  // Drop relocation sentences unless the job mentions the place they name
  text = text.replace(/[^.\n]*\brelocat\w*[^.\n]*\.\s?/gi, sentence => {
    const places = (sentence.match(/\b[A-Z][a-z]{2,}\b/g) || []).filter(w => w !== 'I');
    return places.some(pl => new RegExp('\\b' + pl + '\\b', 'i').test(jd)) ? sentence : '';
  });
  return text.replace(/ +\n/g, '\n').trim();
}

const demoWait = ms => new Promise(r => setTimeout(r, ms));

// Same return shape as callLLM()
async function demoRespond(ctx) {
  await demoWait(500 + Math.random() * 500);
  let text = '';
  if (ctx.kind === 'score' || ctx.kind === 'scrape') text = JSON.stringify(demoScore(ctx.jd || ''));
  else if (ctx.kind === 'cv') text = buildCVData(ctx.jd || '');
  else if (ctx.kind === 'cover') text = demoCoverLetter(ctx.jd || '', ctx.company, ctx.role);
  return { content: [{ type: 'text', text }] };
}
