// ── CLASSIC CV LAYOUT ───────────────────────────────────
// Single-column, serif CV matching a standard Google Docs / Word CV:
// centred name and contact line (with links), ruled section headings,
// "COMPANY ......... Location" / "Job title ......... Dates" rows,
// round bullets, and "Label: values" skills. Flows onto extra pages as needed.

const CV_LAYOUT_KEY = 'cv_layout';
function getCVLayout() { try { return localStorage.getItem(CV_LAYOUT_KEY) || 'classic'; } catch { return 'classic'; } }
function setCVLayout(v) { try { localStorage.setItem(CV_LAYOUT_KEY, v); } catch {} }

function exportClassicCV(parsed, filename, p = profile) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, ML = 16, MR = 16, MT = 15, MB = 15, W = PW - ML - MR;
  const BODY = 9.8, LH = 4.15;
  const DARK = [25, 25, 25], GREY = [95, 95, 95], HEAD = [45, 45, 45], LINK = [17, 85, 204];
  let y = MT;

  const font = (style, size, color = DARK) => { doc.setFont('times', style); doc.setFontSize(size); doc.setTextColor(...color); };
  const room = h => { if (y + h > PH - MB) { doc.addPage(); y = MT + 3; } };

  // ── Header: name + contact line ──
  font('bold', 17);
  doc.text(p.name.toUpperCase(), PW / 2, y + 4, { align: 'center', charSpace: 0.3 });
  y += 9.5;

  const contacts = [p.phone, p.email, p.linkedin, p.github, p.website].filter(Boolean);
  const linkFor = c => c.includes('@') ? 'mailto:' + c : (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(c) ? 'https://' + c.replace(/^https?:\/\//, '') : null);
  font('normal', 9.3);
  const SEP = '  |  ';
  // Greedy wrap of contact items into centred lines
  const lines = [[]];
  for (const c of contacts) {
    const cur = lines[lines.length - 1];
    const trial = [...cur, c].join(SEP);
    if (cur.length && doc.getTextWidth(trial) > W) lines.push([c]); else cur.push(c);
  }
  for (const items of lines) {
    let x = PW / 2 - doc.getTextWidth(items.join(SEP)) / 2;
    items.forEach((c, i) => {
      const url = linkFor(c);
      const isLink = url && !c.includes('@');
      doc.setTextColor(...(isLink ? LINK : DARK));
      doc.text(c, x, y);
      const w = doc.getTextWidth(c);
      if (url) doc.link(x, y - 3, w, 4, { url });
      if (isLink) { doc.setDrawColor(...LINK); doc.setLineWidth(0.15); doc.line(x, y + 0.6, x + w, y + 0.6); }
      x += w;
      if (i < items.length - 1) { doc.setTextColor(...DARK); doc.text(SEP, x, y); x += doc.getTextWidth(SEP); }
    });
    y += 4.2;
  }
  y += 2;

  // ── Building blocks ──
  function heading(text) {
    room(16);
    y += 3.2;
    font('bold', 11, HEAD);
    doc.text(text.toUpperCase(), ML, y);
    y += 1.6;
    doc.setDrawColor(70, 70, 70); doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 4.8;
  }

  // Left text (wrapping) with optional right-aligned text on the first line
  function row(left, right, { style = 'normal', color = DARK, rightColor = DARK, rightUrl = null, size = BODY } = {}) {
    font('normal', size);
    const rw = right ? doc.getTextWidth(right) + 5 : 0;
    font(style, size, color);
    const ls = doc.splitTextToSize(left || '', W - rw);
    room(ls.length * LH);
    ls.forEach((l, i) => {
      doc.text(l, ML, y);
      if (i === 0 && right) {
        font('normal', size, rightColor);
        doc.text(right, PW - MR, y, { align: 'right' });
        if (rightUrl) {
          const w = doc.getTextWidth(right);
          doc.link(PW - MR - w, y - 3, w, 4, { url: rightUrl });
          doc.setDrawColor(...LINK); doc.setLineWidth(0.15); doc.line(PW - MR - w, y + 0.6, PW - MR, y + 0.6);
        }
        font(style, size, color);
      }
      y += LH;
    });
  }

  function bullet(text) {
    font('normal', BODY);
    const ls = doc.splitTextToSize(text, W - 6);
    room(ls.length * LH);
    doc.setFillColor(...DARK);
    doc.circle(ML + 2.1, y - 1.2, 0.75, 'F');
    ls.forEach(l => { doc.text(l, ML + 6, y); y += LH; });
    y += 0.35;
  }

  function plain(text, color = DARK) { row(text, '', { color }); }

  // "Label: values" with a bold label
  function labelled(line) {
    const m = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (!m) { plain(line); return; }
    font('bold', BODY);
    const label = m[1] + ': ';
    const lw = doc.getTextWidth(label);
    font('normal', BODY);
    const first = doc.splitTextToSize(m[2], W - lw);
    const rest = first.length > 1 ? doc.splitTextToSize(first.slice(1).join(' '), W) : [];
    room((1 + rest.length) * LH);
    font('bold', BODY); doc.text(label, ML, y);
    font('normal', BODY); doc.text(first[0] || '', ML + lw, y);
    y += LH;
    rest.forEach(l => { doc.text(l, ML, y); y += LH; });
  }

  // Keep an entry's header lines together with its first bullet
  const keepWith = n => room(n * LH + 2);

  // Capitals for headings, but leave bracketed parts as written: "MEDIQ (Healthcare)"
  const caps = t => (t || '').replace(/([^()]+)(?=\(|$)/g, m => m.toUpperCase());

  // Split "Company, Location" into its two parts
  const splitOrg = s => { const i = (s || '').indexOf(', '); return i > 0 ? [s.slice(0, i), s.slice(i + 2)] : [s || '', '']; };
  const H = parsed.headings || {};

  // ── Summary ──
  if (parsed.summary.length) {
    heading(H.summary || 'Summary');
    parsed.summary.forEach(bullet);
  }

  // ── Education ──
  const edu = parsed.education;
  if (edu && (edu.degree || edu.institution || edu.bullets.length)) {
    heading(H.education || 'Education');
    keepWith(3);
    if (edu.institution) row(caps(edu.institution), '', { style: 'bold' });
    if (edu.degree || edu.years) row(edu.degree, edu.years, { color: GREY });
    edu.bullets.forEach(b => plain(b));
  }

  // ── Work experience ──
  if (parsed.experience.length) {
    heading(H.experience || 'Work Experience');
    parsed.experience.forEach((job, i) => {
      if (i) y += 2.2;
      keepWith(3);
      const [org, loc] = splitOrg(job.company);
      if (org) row(caps(org), loc, { style: 'bold' });
      row(job.title, job.period);
      job.bullets.forEach(bullet);
    });
  }

  // ── Projects ──
  if (parsed.projects.length) {
    heading(H.projects || 'Projects');
    parsed.projects.forEach((proj, i) => {
      if (i) y += 1.6;
      keepWith(3);
      const link = proj.link || '';
      const url = link ? linkFor(link) : null;
      // Bold caps title, with the stack in regular weight on the same line if it fits
      font('normal', BODY);
      const rw = link ? doc.getTextWidth(link) + 5 : 0;
      font('bold', BODY);
      const title = caps(proj.title);
      const tw = doc.getTextWidth(title);
      font('normal', BODY);
      const stackText = proj.stack ? '  —  ' + proj.stack : '';
      if (stackText && tw + doc.getTextWidth(stackText) <= W - rw) {
        room(LH);
        font('bold', BODY); doc.text(title, ML, y);
        font('normal', BODY, GREY); doc.text(stackText, ML + tw, y);
        if (link) {
          font('normal', BODY, url ? LINK : DARK);
          const w = doc.getTextWidth(link);
          doc.text(link, PW - MR, y, { align: 'right' });
          if (url) {
            doc.link(PW - MR - w, y - 3, w, 4, { url });
            doc.setDrawColor(...LINK); doc.setLineWidth(0.15); doc.line(PW - MR - w, y + 0.6, PW - MR, y + 0.6);
          }
        }
        y += LH;
      } else {
        row(title, link, { style: 'bold', rightColor: url ? LINK : DARK, rightUrl: url });
        if (proj.stack) row(proj.stack, '', { color: GREY });
      }
      proj.bullets.forEach(bullet);
    });
  }

  // ── Skills / additional ──
  if (parsed.skills.length) {
    heading(H.skills || 'Technical Skills');
    parsed.skills.forEach(labelled);
  }

  doc.save(filename);
  return doc;
}
