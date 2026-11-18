// Profile data, summary rules and buildCVData() live in js/profile.js

const DEMO_JOBS = [
  { id:1, title:"Junior Backend Developer", company:"Monzo", location:"London (Hybrid)", salary:"£35,000–£45,000", type:"Full-time", source:"Adzuna", url:"https://monzo.com/careers", description:"Join Monzo's engineering team building reliable, scalable backend services. You'll work with Python, REST APIs and SQL databases. We need someone with strong Python fundamentals, Git fluency, Linux comfort and experience with unit and integration testing. Cloud experience (GCP a plus). Small autonomous teams. We value collaboration, attention to detail, a growth mindset and proactive ownership." },
  { id:2, title:"Graduate Data Analyst", company:"HSBC", location:"London (Office)", salary:"£28,000–£32,000", type:"Graduate Scheme", source:"Reed", url:"https://hsbc.com/careers", description:"HSBC Graduate Technology Programme — data analytics track. Build dashboards, run SQL queries, analyse structured datasets and support BI teams. Strong Python (Pandas, Matplotlib), SQL and experience with data pipelines required. Exposure to financial services or BFSI sector is highly desirable. Structured graduate programme with mentoring and rotation." },
  { id:3, title:"Junior Full Stack Developer", company:"Deliveroo", location:"London (Hybrid)", salary:"£38,000–£48,000", type:"Full-time", source:"Adzuna", url:"https://deliveroo.co.uk/careers", description:"Build and scale consumer-facing products using TypeScript and Node.js. Work across the stack — REST APIs, backend services, frontend interfaces. CMS architecture experience and Git workflows a plus. Fast-moving team that values ownership and collaboration." },
  { id:4, title:"Data Engineering Graduate", company:"Barclays", location:"London / Manchester", salary:"£30,000–£38,000", type:"Graduate Scheme", source:"Reed", url:"https://barclays.com/careers", description:"CS graduates with strong programming skills and passion for data. Work with BigQuery, SQL and Python pipelines. Data visualisation (Matplotlib or similar), ML fundamentals and GCP experience advantageous. 24-month rotation across data engineering, analytics and infrastructure." },
  { id:5, title:"Backend Engineer (Entry Level)", company:"Wise", location:"London (Hybrid)", salary:"£40,000–£50,000", type:"Full-time", source:"Remotive", url:"https://wise.com/careers", description:"Build financial infrastructure in Python or TypeScript. HTTP services, REST APIs, PostgreSQL. Strong software engineering principles — algorithm design, testing (unit/integration). Git, Linux, command line required. Fintech or BFSI exposure a bonus." },
  { id:6, title:"Junior Python Developer", company:"Faculty AI", location:"London / Remote", salary:"£32,000–£42,000", type:"Full-time", source:"Remotive", url:"https://faculty.ai/careers", description:"Applied AI company hiring junior Python developer interested in data science and ML. Data pipelines, Pandas, NumPy, ML model implementation, output visualisation. Django/Flask, SQL and version control required. ML fundamentals, regression, preprocessing a strong plus. GCP beneficial." },
  { id:7, title:"TypeScript Developer (Junior)", company:"Typeform", location:"Remote (UK)", salary:"£35,000–£45,000", type:"Full-time", source:"Remotive", url:"https://typeform.com/careers", description:"Junior TypeScript developer for our product team. TypeScript, Node.js web apps, CMS architectures, backend HTTP services. REST APIs, frontend dev and Git required. Sanity.io / headless CMS a bonus. Remote-first, async culture." },
  { id:8, title:"Software Engineer Graduate", company:"Amazon", location:"London", salary:"£45,000–£55,000", type:"Graduate Scheme", source:"Adzuna", url:"https://amazon.com/careers", description:"Amazon Software Engineer Graduate Programme. CS degree required. Java, Python or TypeScript. Strong OOP, data structures, algorithms, software engineering. REST APIs, SQL, GCP/AWS. Tested, production-ready code from day one with senior mentorship." }
];

const state = {
  applications: JSON.parse(localStorage.getItem('tf_apps') || '[]'),
  currentResult: null,
  allJobs: [],
  activeFilter: 'all'
};

// ── NAV ───────────────────────────────────────────────
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  (el || event.currentTarget).classList.add('active');
  if (name === 'tracker') renderTracker();
  if (name === 'profile') { renderProfileForm(); renderJSearchKeyForm(); document.getElementById('importResult').style.display = 'none'; }
}

// ── GENERATE ──────────────────────────────────────────
async function generate() {
  const jobInput = document.getElementById('jobInput').value.trim();
  const company = document.getElementById('companyInput').value.trim();
  const role = document.getElementById('roleInput').value.trim();
  const err = document.getElementById('genError');
  err.classList.remove('visible');
  if (!jobInput) { err.textContent = 'Please paste a job description first.'; err.classList.add('visible'); return; }

  if (ollamaStatus === 'error' && !DEMO.active) {
    err.textContent = 'Ollama is not running. Follow the setup guide above and click "Check Again" — or click "Try demo mode instead".';
    err.classList.add('visible');
    document.getElementById('ollamaSetup').style.display = 'block';
    return;
  }

  document.getElementById('generateBtn').disabled = true;
  document.getElementById('resultsSection').classList.remove('visible');
  setLoading(true, `Running ${modelLabel()}...`, 'step 1 of 3');

  // ── 3 SEPARATE FOCUSED CALLS (local models handle these much better than one giant JSON prompt) ──

  try {
    // ── CALL 1: Score + keywords ─────────────────────
    setLoading(true, `Scoring job fit...`, 'step 1 of 3');
    const scorePrompt = `You are evaluating a job application fit. Score 1-10 how well this candidate matches this job.

CANDIDATE SKILLS: ${profile.scoringSummary}

JOB: ${jobInput.substring(0, 600)}

Reply with ONLY this JSON and nothing else:
{"score":7,"scoreReason":"brief reason under 15 words","keywordsUsed":["keyword1","keyword2","keyword3","keyword4","keyword5"]}`;

    const scoreData = await callLLM(scorePrompt, 200, { kind:'score', jd: jobInput });
    const scoreText = extractText(scoreData);
    const scoreResult = safeParseJSON(scoreText, { score: 6, scoreReason: 'Good candidate match', keywordsUsed: [] });

    // ── CALL 2: Tailored CV ──────────────────────────
    setLoadingText(`Tailoring CV with ${modelLabel()}...`, 'step 2 of 3');
    const cvForJob = buildCVData(jobInput); // summary already pre-filtered for this job
    const cvPrompt = `Rewrite this CV to better match the job description below. Only reorder and reframe existing content — do NOT invent new skills or experience. Use keywords from the job description where they match real experience. Keep the SUMMARY section exactly as given — do not change it.

CV:
${cvForJob}

JOB: ${jobInput.substring(0, 800)}
${company ? 'Company: ' + company : ''}
${role ? 'Role: ' + role : ''}

Output the full rewritten CV as plain text only. No JSON, no markdown, no commentary. Start directly with the name.`;

    const cvData = await callLLM(cvPrompt, 1500, { kind:'cv', jd: jobInput });
    const tailoredCV = extractText(cvData).trim() || cvForJob;

    // ── CALL 3: Cover letter ─────────────────────────
    setLoadingText(`Writing cover letter...`, 'step 3 of 3');

    // Standard cover letter template from the profile — fill the blanks and tailor the body
    const coverPrompt = `You are helping ${profile.name} tailor their cover letter for a specific job application.

Here is their STANDARD cover letter template. Your job is to:
1. Fill in the blanks (marked ____) with the role and company
2. Rewrite the body paragraphs to highlight experience most relevant to this specific job — but preserve the writing voice, sentence structure and level of detail
3. Keep the opening paragraph's structure from the template
4. Keep the closing paragraph — fill the blank about WHY they are drawn to this specific company/role based on the job description
5. Keep any sentence about relocating ONLY if the job is based in the place it mentions — otherwise remove that sentence
6. Keep the sign-off and name at the end exactly as in the template
7. Do NOT add skills, tools, numbers or experience that are not in the template
8. Output plain text only — no JSON, no markdown, no commentary

ROLE: ${role || 'Software Developer'}
COMPANY: ${company || 'the company'}
JOB DESCRIPTION: ${jobInput.substring(0, 700)}

STANDARD TEMPLATE TO TAILOR:
---
${profile.coverTemplate.trim()}
---

Output the tailored cover letter only. Start with "Dear Hiring Manager,".`;

    const coverData = await callLLM(coverPrompt, 1200, { kind:'cover', jd: jobInput, company, role });
    const coverLetter = extractText(coverData).trim();

    setLoading(false);
    document.getElementById('generateBtn').disabled = false;

    const score = Math.min(10, Math.max(1, scoreResult.score || 6));
    state.currentResult = {
      score, scoreReason: scoreResult.scoreReason,
      tailoredCV, coverLetter,
      keywordsUsed: scoreResult.keywordsUsed || [],
      company: company || 'Unknown', role: role || 'Unknown Role',
      date: new Date().toISOString()
    };

    document.getElementById('scoreValue').textContent = score + '/10';
    document.getElementById('scoreFill').style.width = (score * 10) + '%';
    document.getElementById('scoreReason').textContent = scoreResult.scoreReason || '';
    const badge = document.getElementById('matchBadge');
    badge.textContent = score >= 8 ? 'Strong Match' : score >= 6 ? 'Good Match' : 'Partial Match';
    badge.className = 'badge ' + (score >= 8 ? 'badge-green' : score >= 6 ? 'badge-blue' : 'badge-warn');

    document.getElementById('cvOutput').textContent = tailoredCV;
    document.getElementById('coverOutput').textContent = coverLetter;
    runFactCheck({ highlight: true });
    document.getElementById('keywordsOutput').innerHTML = (scoreResult.keywordsUsed || []).map(k => `<span class="keyword-pill">${fcEscapeHTML(String(k))}</span>`).join('');

    document.getElementById('resultsSection').classList.add('visible');
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch(e) {
    setLoading(false);
    document.getElementById('generateBtn').disabled = false;
    // Show the actual error so it's debuggable
    err.textContent = DEMO.active
      ? `Error: ${e.message || e}.`
      : `Error: ${e.message || e}. Check that Ollama is running and the model "${ollamaModel}" is installed (run: ollama pull ${ollamaModel}).`;
    err.classList.add('visible');
    console.error('Generation error:', e);
  }
}

// ── PDF EXPORT ────────────────────────────────────────
function exportPDF(type) {
  const { jsPDF } = window.jspdf;
  const company = document.getElementById('companyInput').value.trim() || 'Application';
  const role    = document.getElementById('roleInput').value.trim();
  const filename = `${profile.name.replace(/\s+/g,'_')}_${type==='cv'?'CV':'CoverLetter'}_${company.replace(/\s+/g,'_')}.pdf`;

  if (type === 'cover') { exportCoverLetterPDF(company, role, filename); return; }

  // ── CANVA TWO-COLUMN CV LAYOUT ──────────────────────
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const PW = 210, PH = 297;

  // Parse the tailored CV text back into structured sections
  const cvText = document.getElementById('cvOutput').innerText;
  const parsed = parseCVText(cvText);

  // ── LAYOUT CONSTANTS (matching Canva template) ──────
  const HEADER_H  = 25;       // name banner height
  const LEFT_W    = PW * 0.37; // left col width
  const DIV_X     = LEFT_W;
  const LX        = 8;         // left col x margin
  const RX        = LEFT_W + 7; // right col x start
  const RW        = PW - RX - 8; // right col usable width
  const BODY_TOP  = PH - HEADER_H - 3; // y from top where body starts (jsPDF: y=0 is top)
  const BOT_LIMIT = 12;        // bottom margin stop

  // Helpers: jsPDF y=0 is top-left
  let overflow = false; // set when something doesn't fit on the page
  function fits(y) { if (y < PH - BOT_LIMIT) return true; overflow = true; return false; }

  let ly = HEADER_H + 8; // left col cursor (mm from top)
  let ry = HEADER_H + 8; // right col cursor

  // ── HEADER: light grey name banner ──────────────────
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, PW, HEADER_H, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(0, HEADER_H, PW, HEADER_H);

  // Name — large, letter-spaced, centered
  doc.setFont('helvetica','bold');
  doc.setFontSize(22);
  doc.setTextColor(25,25,25);
  const nameStr = profile.name.toUpperCase();
  doc.text(nameStr, PW/2, HEADER_H - 7, { align:'center', charSpace: 2.5 });

  // ── VERTICAL DIVIDER ────────────────────────────────
  doc.setDrawColor(200,200,200);
  doc.setLineWidth(0.3);
  doc.line(DIV_X, HEADER_H, DIV_X, PH - BOT_LIMIT);

  // ── SECTION HEADER HELPERS ───────────────────────────
  function sectionLeft(title, y) {
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(25,25,25);
    doc.text(title.toUpperCase(), LX, y);
    y += 1.2;
    doc.setDrawColor(180,180,180);
    doc.setLineWidth(0.35);
    doc.line(LX, y, LEFT_W - 5, y);
    return y + 5;
  }

  function sectionRight(title, y) {
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.5);
    doc.setTextColor(25,25,25);
    doc.text(title.toUpperCase(), RX, y);
    y += 1.2;
    doc.setDrawColor(180,180,180);
    doc.setLineWidth(0.35);
    doc.line(RX, y, PW - 8, y);
    return y + 5.5;
  }

  function wrapText(text, font, size, maxW) {
    doc.setFont('helvetica', font); doc.setFontSize(size);
    return doc.splitTextToSize(text, maxW);
  }

  function leftText(text, y, { bold=false, size=7, color=[60,60,60], indent=0 }={}) {
    doc.setFont('helvetica', bold?'bold':'normal');
    doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, LEFT_W - LX - 5 - indent);
    lines.forEach(l => { if (fits(y)) { doc.text(l, LX+indent, y); y += size*0.42; } });
    return y;
  }

  function rightText(text, y, { bold=false, size=7.8, color=[40,40,40], indent=0 }={}) {
    doc.setFont('helvetica', bold?'bold':'normal');
    doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, RW - indent);
    lines.forEach(l => { if (fits(y)) { doc.text(l, RX+indent, y); y += size*0.42; } });
    return y;
  }

  function rightBullet(text, y, size=7.8) {
    if (!fits(y)) return y;
    doc.setFillColor(100,100,100);
    doc.circle(RX + 2, y - 1.2, 0.8, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(size); doc.setTextColor(70,70,70);
    const lines = doc.splitTextToSize(text, RW - 6);
    lines.forEach((l,i) => { if (fits(y)) { doc.text(l, RX+6, y); y += size*0.42; } });
    return y + 0.5;
  }

  function leftBullet(text, y, size=7) {
    if (!fits(y)) return y;
    doc.setFillColor(120,120,120);
    doc.circle(LX + 1.8, y - 1.1, 0.7, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(size); doc.setTextColor(90,90,90);
    const lines = doc.splitTextToSize(text, LEFT_W - LX - 8);
    lines.forEach(l => { if (fits(y)) { doc.text(l, LX+5, y); y += size*0.42; } });
    return y + 0.5;
  }

  // ── LEFT COL: Contact icons ──────────────────────────
  const iconSize = 4.5;
  const iconGap  = 7.5;
  function iconBox(y) {
    doc.setFillColor(195,195,195);
    doc.roundedRect(LX, y - iconSize + 1, iconSize, iconSize, 0.8, 0.8, 'F');
    return y;
  }

  const contacts = [profile.phone, profile.email, profile.github, profile.linkedin, profile.website].filter(Boolean);
  contacts.forEach(c => {
    iconBox(ly);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(50,50,50);
    doc.text(c, LX + iconSize + 2.5, ly - 0.8);
    ly += iconGap;
  });
  ly += 4;

  // ── LEFT COL: Education ──────────────────────────────
  ly = sectionLeft('EDUCATION', ly);
  const edu = parsed.education;
  if (edu) {
    if (edu.degree) { ly = leftText(edu.degree, ly, { bold:true, size:7.2, color:[25,25,25] }); ly += 0.5; }
    if (edu.institution) ly = leftText(edu.institution, ly, { size:6.8, color:[80,80,80] });
    if (edu.years) ly = leftText(edu.years, ly, { size:6.8, color:[110,110,110] });
    ly += 1.5;
    (edu.bullets||[]).forEach(b => { ly = leftBullet(b, ly, 6.8); });
  }
  ly += 6;

  // ── LEFT COL: Technical Skills ───────────────────────
  ly = sectionLeft('TECHNICAL SKILLS', ly);
  (parsed.skills||[]).forEach(sk => {
    ly = leftText(sk, ly, { size:6.8, color:[80,80,80] });
    ly += 2.5;
  });

  // ── RIGHT COL: Summary ───────────────────────────────
  ry = sectionRight('SUMMARY', ry);
  (parsed.summary||[]).forEach(b => { ry = rightBullet(b, ry); });
  ry += 5;

  // ── RIGHT COL: Work Experience ───────────────────────
  ry = sectionRight('WORK EXPERIENCE', ry);
  (parsed.experience||[]).forEach(job => {
    if (!fits(ry)) return;
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(25,25,25);
    doc.splitTextToSize((job.title||'').toUpperCase(), RW).forEach(l => {
      if (fits(ry)) { doc.text(l, RX, ry); ry += 3.6; }
    });
    ry += 0.4;
    // Company (left) + period (right) on the same line
    if (job.company || job.period) {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
      let periodW = 0;
      if (job.period) {
        periodW = doc.getTextWidth(job.period) + 4;
        doc.setTextColor(130,130,130);
        if (fits(ry)) doc.text(job.period, PW-8, ry, { align:'right' });
      }
      doc.setTextColor(100,100,100);
      const compLines = doc.splitTextToSize((job.company||'').toUpperCase(), RW - periodW);
      compLines.forEach(l => { if (fits(ry)) { doc.text(l, RX, ry); ry += 3.4; } });
      if (!compLines.length || !job.company) ry += 3.4;
      ry += 1.1;
    }
    (job.bullets||[]).forEach(b => { ry = rightBullet(b, ry); });
    ry += 4;
  });

  // ── RIGHT COL: Projects ──────────────────────────────
  ry = sectionRight('PROJECT EXAMPLES', ry);
  (parsed.projects||[]).forEach(proj => {
    const header = proj.stack ? `${proj.title} — ${proj.stack}` : proj.title;
    doc.setFont('helvetica','bold'); doc.setFontSize(7.8); doc.setTextColor(40,40,40);
    const plines = doc.splitTextToSize(header, RW);
    plines.forEach(l => { if (fits(ry)) { doc.text(l, RX, ry); ry += 4; } });
    (proj.bullets||[]).forEach(b => { ry = rightBullet(b, ry, 7.5); });
    ry += 4;
  });

  doc.save(filename);
  if (overflow) {
    showToast('CV exported, but it ran past one page — some content was cut. Shorten the CV text and export again.', 'error');
  } else {
    showToast('CV exported in Canva layout ✓', 'success');
  }
}

// Parse plain-text CV into structured sections for the Canva layout
function parseCVText(text) {
  // Strip markdown the model sometimes adds (**bold**, # headings)
  const lines = text.split('\n')
    .map(l => l.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim())
    .filter(Boolean);
  const result = {
    education: { degree:'', institution:'', years:'', bullets:[] },
    skills: [], summary: [], experience: [], projects: []
  };

  // A line is a section header only if it IS the header (ignoring case/punctuation),
  // so a bullet mentioning "skills" or "experience" can't switch sections.
  const HEADERS = {
    'SUMMARY':'summary', 'PROFILE':'summary', 'PROFESSIONAL SUMMARY':'summary',
    'EDUCATION':'education',
    'WORK EXPERIENCE':'experience', 'EXPERIENCE':'experience', 'PROFESSIONAL EXPERIENCE':'experience', 'EMPLOYMENT':'experience',
    'PROJECTS':'projects', 'PROJECT EXAMPLES':'projects', 'KEY PROJECTS':'projects', 'PERSONAL PROJECTS':'projects',
    'UNIVERSITY AND PERSONAL PROJECTS':'projects', 'ACADEMIC PROJECTS':'projects', 'ACADEMIC AND PERSONAL PROJECTS':'projects',
    'TECHNICAL SKILLS':'skills', 'SKILLS':'skills', 'KEY SKILLS':'skills', 'ADDITIONAL':'skills', 'ADDITIONAL INFORMATION':'skills', 'SKILLS AND INTERESTS':'skills'
  };
  const YEARS_RE = /\(?\s*((?:19|20)\d{2}\s*[–—-]\s*(?:(?:19|20)\d{2}|present|current)|(?:19|20)\d{2})\s*\)?/i;
  const SEP_RE = /\s+[—–]\s+|\s+-\s+/; // "Title — Company"

  let section = '';
  let currentJob = null;
  let currentProj = null;

  lines.forEach(line => {
    const norm = line.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
    if (HEADERS[norm]) { section = HEADERS[norm]; currentJob = null; currentProj = null; return; }

    const isBullet = /^[-•*·]\s*/.test(line);
    const clean = line.replace(/^[-•*·]\s*/, '');

    if (section === 'summary') {
      if (isBullet || line.length > 20) result.summary.push(clean);
      return;
    }

    if (section === 'education') {
      if (isBullet) { result.education.bullets.push(clean); return; }
      // "Degree — Institution (2021–2024)" on one line
      if (SEP_RE.test(line) && !result.education._headerSeen) {
        result.education._headerSeen = true;
        const ym = line.match(YEARS_RE);
        if (ym) result.education.years = ym[1];
        const noYears = line.replace(YEARS_RE, '').trim();
        const [deg, ...rest] = noYears.split(SEP_RE);
        result.education.degree = deg.trim();
        if (rest.length) result.education.institution = rest.join(' — ').trim();
        return;
      }
      if (/^(?:19|20)\d{2}/.test(line) && line.length < 20) { result.education.years = line; return; }
      if (line.length > 5) result.education.bullets.push(clean);
      return;
    }

    if (section === 'skills') {
      result.skills.push(clean);
      return;
    }

    if (section === 'experience') {
      if (isBullet) { if (currentJob) currentJob.bullets.push(clean); return; }
      // "Title — Company | Period"
      let title = line, company = '', period = '';
      const pipe = title.split(/\s*\|\s*/);
      if (pipe.length > 1) { period = pipe.pop(); title = pipe.join(' | '); }
      if (SEP_RE.test(title)) {
        const [t, ...rest] = title.split(SEP_RE);
        title = t; company = rest.join(' — ');
      }
      // Lines under a job header that aren't bullets: fill company/period
      if (currentJob && currentJob.bullets.length === 0 && !SEP_RE.test(line) && pipe.length === 1) {
        if (!currentJob.company) { currentJob.company = line; return; }
        if (!currentJob.period && (YEARS_RE.test(line) || /^(current|present)$/i.test(line))) { currentJob.period = line; return; }
      }
      currentJob = { title: title.trim(), company: company.trim(), period: period.trim(), bullets: [] };
      result.experience.push(currentJob);
      return;
    }

    if (section === 'projects') {
      if (isBullet) { if (currentProj) currentProj.bullets.push(clean); return; }
      // New project if: none yet, the line has a "— stack" separator,
      // or the current project already has its description.
      if (!currentProj || SEP_RE.test(line) || currentProj.bullets.length > 0) {
        const parts = line.split(SEP_RE);
        currentProj = {
          title: parts[0].trim(),
          stack: parts.slice(1).join(' — ').trim(),
          bullets: []
        };
        result.projects.push(currentProj);
      } else {
        // Plain description line under a project header
        currentProj.bullets.push(clean);
      }
      return;
    }
  });

  return result;
}

function exportCoverLetterPDF(company, role, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const PW=210, PH=297, M=22, LH=6;
  let y = M;

  // Header — matches CV style
  doc.setFillColor(245,245,245);
  doc.rect(0,0,PW,20,'F');
  doc.setDrawColor(200,200,200); doc.setLineWidth(0.3);
  doc.line(0,20,PW,20);
  doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.setTextColor(25,25,25);
  doc.text(profile.name.toUpperCase(), PW/2, 13, { align:'center', charSpace:1.5 });
  y = 30;

  // Contact strip
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(120,120,120);
  doc.splitTextToSize([profile.phone, profile.email, profile.github, profile.linkedin, profile.website].filter(Boolean).join('  ·  '), PW - 2*M).forEach((l, i) => doc.text(l, PW/2, y + i*3.6, { align:'center' }));
  y += 3.6 * (doc.splitTextToSize([profile.phone, profile.email, profile.github, profile.linkedin, profile.website].filter(Boolean).join('  ·  '), PW - 2*M).length - 1);
  y += 2.5;
  doc.setDrawColor(210,210,210); doc.setLineWidth(0.25);
  doc.line(M, y, PW-M, y);
  y += 9;

  // Date + addressee block
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(70,70,70);
  doc.text(new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }), M, y);
  y += 6;
  if (company && company !== 'Application') {
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(25,25,25);
    doc.text(company, M, y); y += 5;
  }
  if (role) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(90,90,90);
    doc.text('Re: Application for ' + role, M, y); y += 9;
  } else { y += 4; }

  // Body — render paragraph by paragraph preserving the template's voice
  const body = document.getElementById('coverOutput').innerText.trim();

  // Normalise: handle both \n\n and single \n as paragraph breaks
  // Split on blank lines first, then on lines that look like new paragraphs
  const paras = body
    .split(/\n{2,}/)                         // split on blank lines
    .flatMap(p => p.trim() ? [p.trim()] : []) // remove empties
    .filter(Boolean);

  doc.setFont('helvetica','normal');
  doc.setFontSize(9.5);
  doc.setTextColor(35,35,35);

  paras.forEach(para => {
    // "Sincerely," and the name are already in the generated text — render them naturally
    const isSigning = /^(sincerely|yours sincerely|regards|kind regards)/i.test(para);
    if (isSigning) {
      y += 4; // extra space before sign-off
      doc.setFont('helvetica','normal');
    }

    const wrapped = doc.splitTextToSize(para, PW - M*2);
    wrapped.forEach(line => {
      if (y > PH - 18) { doc.addPage(); y = M; }
      doc.text(line, M, y);
      y += LH;
    });
    y += 3.5; // paragraph gap
  });

  doc.save(filename);
  showToast('Cover letter exported ✓', 'success');
}

// ── SCRAPER ───────────────────────────────────────────
async function scrapeJobs() {
  const keywords = document.getElementById('searchKeywords').value.trim();
  const minScore = parseInt(document.getElementById('scoreThreshold').value);
  const err = document.getElementById('scrapeError');
  err.classList.remove('visible');
  if (!keywords) { err.textContent = 'Enter search keywords.'; err.classList.add('visible'); return; }

  document.getElementById('scrapeBtn').disabled = true;
  document.getElementById('scrapeStatus').style.display = 'flex';
  document.getElementById('scrapeStatusText').textContent = 'Fetching job listings...';
  document.getElementById('filterBar').style.display = 'none';
  document.getElementById('apiNotice').style.display = 'none';
  document.getElementById('liveNotice').style.display = 'none';
  document.getElementById('jobFeed').innerHTML = '';

  let pool;
  const live = document.getElementById('searchSource').value === 'jsearch';
  if (live) {
    const location = document.getElementById('searchLocation').value.trim();
    const countrySel = document.getElementById('searchCountry');
    document.getElementById('scrapeStatusText').textContent = 'Searching live jobs...';
    try {
      pool = await fetchJSearchJobs({ keywords, location, country: countrySel.value, datePosted: document.getElementById('searchPosted').value });
    } catch (e) {
      document.getElementById('scrapeBtn').disabled = false;
      document.getElementById('scrapeStatus').style.display = 'none';
      err.textContent = e.message; err.classList.add('visible');
      return;
    }
    if (!pool.length) {
      document.getElementById('scrapeBtn').disabled = false;
      document.getElementById('scrapeStatus').style.display = 'none';
      err.textContent = 'No live jobs found for that search — try broader keywords, a different location, or a longer "Posted" window.';
      err.classList.add('visible');
      return;
    }
    const ln = document.getElementById('liveNotice');
    ln.innerHTML = `<strong style="color:var(--success);">Live results</strong> — ${pool.length} jobs in ${fcEscapeHTML(countrySel.options[countrySel.selectedIndex].text)} from Google for Jobs via JSearch, each scored against your profile.`;
    ln.style.display = 'block';
  } else {
    document.getElementById('apiNotice').style.display = 'block';
    // Filter demo jobs by keywords
    const kws = keywords.toLowerCase().split(' ').filter(k=>k.length>2);
    pool = DEMO_JOBS.filter(j => kws.some(k =>
      j.title.toLowerCase().includes(k) ||
      j.description.toLowerCase().includes(k) ||
      j.type.toLowerCase().includes(k)
    ));
    if (pool.length === 0) pool = DEMO_JOBS.slice(0,5);
  }

  document.getElementById('scrapeStatusText').textContent = `Scoring ${pool.length} listings with ${modelLabel()}...`;

  const scored = [];
  for (let i=0; i<pool.length; i++) {
    const job = pool[i];
    document.getElementById('scrapeStatusText').textContent = `Scoring ${i+1}/${pool.length}: ${job.title} @ ${job.company}`;
    try {
      const p = `Score this job 1-10 for candidate fit. Return ONLY JSON: {"score":7,"reason":"max 12 words explaining fit"}

Candidate: ${profile.scoringSummary}

Job: ${job.title} at ${job.company}
${job.description.substring(0,350)}`;
      const d = await callLLM(p, 150, { kind:'scrape', jd: job.description });
      const r = safeParseJSON(extractText(d), { score: 5, reason: 'Could not score' });
      const sc = Math.round(Number(r.score));
      scored.push({ ...job, score: Number.isFinite(sc) ? Math.min(10, Math.max(1, sc)) : 5, reason: r.reason });
    } catch { scored.push({ ...job, score:5, reason: DEMO.active ? 'Scoring unavailable' : 'Scoring unavailable — is Ollama running?' }); }
  }

  state.allJobs = scored.sort((a,b)=>b.score-a.score);
  document.getElementById('scrapeBtn').disabled = false;
  document.getElementById('scrapeStatus').style.display = 'none';
  document.getElementById('filterBar').style.display = 'flex';
  renderJobs(minScore);
}

function renderJobs(minScore) {
  const feed = document.getElementById('jobFeed');
  const visible = state.allJobs.filter(j => {
    const ok = j.score >= minScore;
    const f = state.activeFilter;
    const match = f === 'all' || j.title.includes(f) || j.type.includes(f) || j.location.includes(f) || j.description.includes(f);
    return ok && match;
  });

  if (!visible.length) {
    feed.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--muted);">
      <div style="font-size:32px;margin-bottom:12px;">🔍</div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">No jobs match your filters</div>
      <div style="font-size:11px;">Try lowering the fit score threshold or broadening your keywords.</div>
    </div>`;
    return;
  }

  feed.innerHTML = visible.map(job => {
    const applied = state.applications.some(a => a.company===job.company && a.role===job.title);
    const sc = job.score;
    const col = sc>=8?'var(--success)':sc>=6?'var(--accent)':'var(--warn)';
    return `<div class="job-card ${applied?'applied':''}" id="jc-${job.id}">
      ${applied?'<div class="applied-stamp">✓ Applied</div>':''}
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:6px;">
        <div style="flex:1;">
          <div class="job-title">${esc(job.title)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;">${esc(job.company)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${col};">${sc}/10</div>
          <div style="font-size:9px;color:var(--muted);">fit score</div>
        </div>
      </div>
      <div class="job-meta">
        <span class="job-tag">📍 ${esc(job.location)}</span>
        <span class="job-tag">💰 ${esc(job.salary)}</span>
        <span class="job-tag">${esc(job.type)}</span>
        <span class="job-tag">via ${esc(job.source)}</span>
      </div>
      <div class="job-snippet">${esc(job.description)}</div>
      ${job.reason?`<div style="font-size:10px;color:var(--muted);font-style:italic;margin-top:6px;">${fcEscapeHTML(String(job.reason))}</div>`:''}
      <div class="job-actions">
        <button class="btn-ghost" style="padding:7px 14px;" onclick="loadJob(${job.id})">⚡ Generate Application</button>
        <a href="${safeUrl(job.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;"><button class="btn-ghost" style="padding:7px 14px;">↗ View Listing</button></a>
      </div>
    </div>`;
  }).join('');
}

function esc(v) { return fcEscapeHTML(String(v ?? '')); }
function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? esc(u) : '#'; }

function filterJobs(f, el) {
  state.activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderJobs(parseInt(document.getElementById('scoreThreshold').value));
}

function loadJob(id) {
  const job = state.allJobs.find(j=>j.id===id);
  if (!job) return;
  document.getElementById('jobInput').value = job.description;
  document.getElementById('companyInput').value = job.company;
  document.getElementById('roleInput').value = job.title;
  // Navigate to generate
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-generate').classList.add('active');
  document.querySelectorAll('.nav-tab')[0].classList.add('active');
  window.scrollTo({ top:0, behavior:'smooth' });
  showToast('Job loaded — hit Generate! ⚡', 'success');
}

// ── TRACKER ───────────────────────────────────────────
function logApplication() {
  if (!state.currentResult) { showToast('Generate an application first.', 'error'); return; }
  const entry = {
    id: Date.now(),
    role: state.currentResult.role || document.getElementById('roleInput').value || 'Unknown Role',
    company: state.currentResult.company || document.getElementById('companyInput').value || 'Unknown',
    score: state.currentResult.score,
    date: new Date().toISOString(),
    status: 'Applied'
  };
  state.applications.unshift(entry);
  localStorage.setItem('tf_apps', JSON.stringify(state.applications));
  document.getElementById('trackerCount').textContent = state.applications.length;
  showToast('Logged to tracker ✓', 'success');
}

function renderTracker() {
  const apps = state.applications;
  document.getElementById('stat-total').textContent = apps.length;
  document.getElementById('trackerCount').textContent = apps.length;
  if (apps.length > 0) {
    document.getElementById('stat-avgScore').textContent = (apps.reduce((s,a)=>s+(a.score||0),0)/apps.length).toFixed(1);
    document.getElementById('stat-thisWeek').textContent = apps.filter(a=>new Date(a.date)>new Date(Date.now()-7*864e5)).length;
    const rc={};
    apps.forEach(a=>{ const t=a.role.includes('Data')?'Data':a.role.includes('Backend')?'Backend':a.role.includes('Graduate')?'Graduate':'Dev'; rc[t]=(rc[t]||0)+1; });
    const top=Object.entries(rc).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('stat-topRole').textContent = top?top[0]:'—';
  }
  const tbody = document.getElementById('logTableBody');
  if (!apps.length) {
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--muted);">No applications logged yet — generate one and hit "Log as Applied"</td></tr>';
    return;
  }
  tbody.innerHTML = apps.map(a=>{
    const sc=a.score||'—', col=sc>=8?'var(--success)':sc>=6?'var(--accent)':'var(--warn)';
    const d=new Date(a.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    return `<tr>
      <td style="font-family:'Syne',sans-serif;font-weight:600;">${a.role}</td>
      <td style="color:var(--muted);">${a.company}</td>
      <td><span style="color:${col};font-family:'Syne',sans-serif;font-weight:700;">${sc}/10</span></td>
      <td style="color:var(--muted);">${d}</td>
      <td><span class="badge badge-green">${a.status}</span></td>
      <td><button class="btn-danger" onclick="deleteApp(${a.id})">Remove</button></td>
    </tr>`;
  }).join('');
}

function deleteApp(id) {
  state.applications = state.applications.filter(a=>a.id!==id);
  localStorage.setItem('tf_apps', JSON.stringify(state.applications));
  renderTracker();
}

// ── LOCAL LLM (OLLAMA) ────────────────────────────────
const OLLAMA_BASE = 'http://localhost:11434';
let ollamaModel = localStorage.getItem('ollama_model') || 'llama3';
let ollamaStatus = 'unknown'; // 'ok' | 'error' | 'unknown'

function modelLabel() {
  return DEMO.active ? 'demo mode' : `${ollamaModel} locally`;
}

// ctx = { kind: 'score' | 'cv' | 'cover' | 'scrape', jd, company, role } — used by demo mode
async function callLLM(prompt, maxTokens = 1000, ctx = {}) {
  if (DEMO.active) return demoRespond(ctx);
  // Ollama /api/generate endpoint (no streaming)
  const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      prompt: prompt,
      stream: false,
      options: { num_predict: maxTokens, temperature: 0.3, num_ctx: 8192 }
    })
  });
  if (!r.ok) throw new Error(`Ollama error: ${r.status} ${r.statusText}`);
  const data = await r.json();
  return { content: [{ type: 'text', text: data.response || '' }] };
}

async function checkOllama() {
  const indicator = document.getElementById('ollamaIndicator');
  const label     = document.getElementById('ollamaLabel');
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const models = (data.models || []).map(m => m.name);
    ollamaStatus = 'ok';
    if (DEMO.active) { DEMO.active = false; document.getElementById('demoBanner').style.display = 'none'; }
    indicator.style.background = '#42f5a8';
    label.textContent = `Ollama · ${models.length} model${models.length!==1?'s':''}`;
    // Populate model selector
    const sel = document.getElementById('modelSelect');
    sel.innerHTML = '';
    if (models.length === 0) {
      sel.innerHTML = '<option value="">No models — run: ollama pull llama3</option>';
    } else {
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        if (m.startsWith(ollamaModel)) opt.selected = true;
        sel.appendChild(opt);
      });
      ollamaModel = sel.value;
      localStorage.setItem('ollama_model', ollamaModel);
    }
    document.getElementById('ollamaSetup').style.display = 'none';
  } catch(e) {
    ollamaStatus = 'error';
    if (demoRequested() || isHostedOnWeb()) { enableDemo(); return; }
    indicator.style.background = '#f55442';
    label.textContent = 'Ollama not detected — see setup below';
    document.getElementById('ollamaSetup').style.display = 'block';
  }
}

function onModelChange(val) {
  ollamaModel = val;
  localStorage.setItem('ollama_model', val);
}

function setLoading(show, step, label) {
  document.getElementById('loadingOverlay').classList.toggle('visible', show);
  if (step) document.getElementById('loadingStep').textContent = step;
  if (label) document.getElementById('loadingLabel').textContent = label;
}

function setLoadingText(step, label) {
  document.getElementById('loadingStep').textContent = step;
  document.getElementById('loadingLabel').textContent = label;
}

// Pull the text string out of whatever shape callLLM returns
function extractText(data) {
  return (data.content || []).map(b => b.text || '').join('').trim();
}

// Try to parse JSON — strip markdown fences, extract first {...} block if needed
function safeParseJSON(text, fallback = {}) {
  try {
    // Strip ```json ... ``` fences
    let clean = text.replace(/^```json\s*|^```\s*|\s*```$/gm, '').trim();
    // If model added preamble, find the first { ... } block
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1);
    return JSON.parse(clean);
  } catch {
    console.warn('JSON parse failed on:', text.substring(0, 200));
    return fallback;
  }
}

function switchTab(name, el) {
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  (el||event.currentTarget).classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}

function copyText(id, btn) {
  navigator.clipboard.writeText(document.getElementById(id).innerText).then(()=>{
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(()=>btn.textContent=orig, 2000);
  });
}

function clearGen() {
  ['jobInput','companyInput','roleInput'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('resultsSection').classList.remove('visible');
  document.getElementById('genError').classList.remove('visible');
  document.getElementById('factCheck').classList.remove('visible');
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast '+type;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3200);
}

// ── PROFILE TAB ───────────────────────────────────────
const PF_RULE_KEYS = ['maxBullets', 'stackVariants', 'cloudTriggers', 'cloudVariants', 'conditional'];

function renderProfileForm() {
  const p = profile, s = p.summary || {};
  const set = (id, v) => { document.getElementById(id).value = v || ''; };
  set('pf-name', p.name); set('pf-phone', p.phone); set('pf-email', p.email);
  set('pf-github', p.github); set('pf-linkedin', p.linkedin); set('pf-website', p.website);
  set('pf-scoring', p.scoringSummary);
  set('pf-intro', s.intro); set('pf-soft', s.softSkills);
  const rules = {}; PF_RULE_KEYS.forEach(k => rules[k] = s[k]);
  set('pf-rules', JSON.stringify(rules, null, 2));
  set('pf-cv', p.cvBody); set('pf-cover', p.coverTemplate);
  document.getElementById('profileError').classList.remove('visible');
}

function readProfileForm() {
  const get = id => document.getElementById(id).value.trim();
  let rules;
  try { rules = JSON.parse(get('pf-rules') || '{}'); }
  catch (e) { throw new Error('Tailoring rules aren\'t valid JSON: ' + e.message); }
  for (const k of ['stackVariants', 'cloudVariants', 'conditional']) {
    if (rules[k] && !(Array.isArray(rules[k]) && rules[k].every(v => v && typeof v.text === 'string' && Array.isArray(v.tags)))) {
      throw new Error(`Tailoring rules: "${k}" must be a list of { "text": "...", "tags": [...] }`);
    }
  }
  const p = {
    name: get('pf-name'), phone: get('pf-phone'), email: get('pf-email'),
    github: get('pf-github'), linkedin: get('pf-linkedin'), website: get('pf-website'),
    scoringSummary: get('pf-scoring'),
    summary: { intro: get('pf-intro'), softSkills: get('pf-soft') },
    cvBody: get('pf-cv'), coverTemplate: get('pf-cover')
  };
  PF_RULE_KEYS.forEach(k => { if (rules[k] !== undefined) p.summary[k] = rules[k]; });
  if (!p.name) throw new Error('Name is required.');
  if (!p.cvBody) throw new Error('CV body is required.');
  if (!p.coverTemplate) throw new Error('Cover letter template is required.');
  return p;
}

function saveProfileForm() {
  const err = document.getElementById('profileError');
  err.classList.remove('visible');
  try {
    profile = readProfileForm();
    saveProfile(profile);
    applyProfileBranding();
    showToast('Profile saved ✓', 'success');
  } catch (e) {
    err.textContent = e.message; err.classList.add('visible');
  }
}

function resetProfileForm() {
  if (!confirm('Reset your profile to the defaults in js/profile.js? Your saved edits will be lost (export them first if you want a backup).')) return;
  profile = resetProfile();
  renderProfileForm(); applyProfileBranding();
  showToast('Profile reset to defaults', 'success');
}

function exportProfileJSON() {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${profile.name.replace(/\s+/g, '_')}_profile.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProfileJSON(input) {
  const file = input.files[0];
  if (!file) return;
  file.text().then(txt => {
    const data = JSON.parse(txt);
    if (!data || typeof data !== 'object' || !data.name || !data.cvBody) throw new Error('missing name or cvBody');
    const base = baseProfile();
    profile = { ...base, ...data, summary: { ...base.summary, ...(data.summary || {}) } };
    saveProfile(profile);
    renderProfileForm(); applyProfileBranding();
    showToast('Profile imported ✓', 'success');
  }).catch(e => {
    const err = document.getElementById('profileError');
    err.textContent = 'Couldn\'t import that file: ' + e.message; err.classList.add('visible');
  }).finally(() => { input.value = ''; });
}

function applyProfileBranding() {
  const initials = profile.name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  document.getElementById('logoMark').textContent = initials || 'JB';
  document.title = `${profile.name.split(/\s+/)[0]} — Job Application Bot`;
}

// Init
applyProfileBranding();
updateSourceSelect();
document.getElementById('trackerCount').textContent = state.applications.length;
renderTracker();
if (demoRequested()) enableDemo();
else checkOllama(); // auto-check Ollama on load
