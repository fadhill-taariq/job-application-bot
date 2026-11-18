// ── PROFILE ─────────────────────────────────────────────
// The single source of truth for everything the bot writes about you:
// contact details, the skills used for job scoring, the summary bullet rules,
// the CV body and the cover letter template.
//
// Edit these defaults here, or in the app's Profile tab (saved in this browser
// and exportable as JSON). Saved Profile-tab edits take priority over this file.

const DEFAULT_PROFILE = {
  "name": "Taariq Fadhil",
  "phone": "07771548194",
  "email": "fadhill.taariq@gmail.com",
  "github": "github.com/fadhill-taariq",
  "linkedin": "linkedin.com/in/taariq-fadhil",
  "scoringSummary": "Python, TypeScript, JavaScript, Django, Node.js, REST APIs, SQL, MySQL, BigQuery, GCP, Git, Linux, Machine Learning basics, Data Visualisation, HTML/CSS. BSc Computer Science (Exeter). Freelance web dev (TypeScript, Sanity.io). Production operator (QA, Lean/5S).",
  "summary": {
    "intro": "BSc Computer Science graduate from the University of Exeter (2021–2024), with emphasis on software engineering, algorithm design and data analysis.",
    "softSkills": "Strong attention to detail, cooperative, proactive and energetic — comfortable working in both team and independent environments.",
    "maxBullets": 5,
    "stackVariants": [
      {
        "tags": [
          "typescript",
          "sanity",
          "cms",
          "headless",
          "content"
        ],
        "text": "Production TypeScript experience building and maintaining a live healthcare content platform, including a headless CMS architecture, GROQ queries and HTTP backend services."
      },
      {
        "tags": [
          "python",
          "django",
          "flask",
          "fastapi",
          "script",
          "automation"
        ],
        "text": "Hands-on Python development experience including Django, data scripting and automation, alongside TypeScript production work building backend HTTP services and CMS integrations."
      },
      {
        "tags": [
          "machine learning",
          "ml",
          "data science",
          "sklearn",
          "scikit",
          "numpy",
          "pandas",
          "regression",
          "modelling"
        ],
        "text": "Python development experience applied to both data science (regression models, Pandas, Matplotlib, scikit-learn) and production backend services (TypeScript, Node.js, REST APIs)."
      },
      {
        "tags": [
          "backend",
          "node",
          "node.js",
          "express",
          "http",
          "server",
          "rest",
          "api",
          "microservice"
        ],
        "text": "Hands-on backend development experience using TypeScript and Node.js — building HTTP request-handling services, REST APIs and backend data pipelines in a production environment."
      },
      {
        "tags": [
          "full stack",
          "fullstack",
          "full-stack",
          "frontend",
          "react",
          "vue",
          "html",
          "css"
        ],
        "text": "Full-stack development experience spanning TypeScript backend services, HTML/CSS frontend interfaces and CMS-driven content delivery, built and maintained in a live production environment."
      },
      {
        "tags": [
          "javascript",
          "js",
          "web",
          "browser"
        ],
        "text": "Web development experience across TypeScript, JavaScript and Python — including a live production healthcare platform, browser-based applications and backend service development."
      },
      {
        "tags": [
          "default"
        ],
        "text": "Hands-on backend and frontend development experience using TypeScript, Python and JavaScript, with production deployments in a regulated healthcare environment."
      }
    ],
    "cloudTriggers": [
      "gcp",
      "cloud",
      "google cloud",
      "compute engine",
      "ml",
      "machine learning",
      "ai",
      "bigquery",
      "vertex"
    ],
    "cloudVariants": [
      {
        "tags": [
          "bigquery",
          "data pipeline",
          "data engineering",
          "data warehouse",
          "data warehousing"
        ],
        "text": "Familiar with GCP including BigQuery for data querying and pipeline work, and Compute Engine from university AI/ML projects."
      },
      {
        "tags": [
          "machine learning",
          "ml",
          "ai",
          "model",
          "training",
          "inference",
          "vertex"
        ],
        "text": "Hands-on GCP experience with AI/ML operations and Compute Engine through university projects, including training and evaluating regression models on structured datasets."
      },
      {
        "tags": [
          "cloud",
          "gcp",
          "google cloud",
          "compute engine",
          "infrastructure",
          "devops",
          "deploy"
        ],
        "text": "Familiar with GCP (Compute Engine, AI/ML operations) from university coursework and personal projects; comfortable working in cloud-based development environments."
      },
      {
        "tags": [
          "default"
        ],
        "text": "Familiar with GCP (Compute Engine, AI/ML operations) from university and personal projects."
      }
    ],
    "conditional": [
      {
        "text": "Passion for data analytics and management; experience building and querying database systems using SQL, MySQL and BigQuery.",
        "tags": [
          "data",
          "analytics",
          "sql",
          "database",
          "bigquery",
          "analyst",
          "bi",
          "intelligence",
          "reporting"
        ]
      },
      {
        "text": "Understanding of the BFSI sector and financial services technology landscape.",
        "tags": [
          "bfsi",
          "finance",
          "financial",
          "banking",
          "fintech",
          "investment",
          "payments",
          "insurance"
        ]
      },
      {
        "text": "Experience with object-oriented programming in Java through university pair-programming projects.",
        "tags": [
          "java",
          "oop",
          "object-oriented",
          "object oriented"
        ]
      },
      {
        "text": "Experienced building and consuming REST APIs and backend HTTP services in TypeScript and Python.",
        "tags": [
          "api",
          "rest",
          "endpoint",
          "microservice",
          "integration",
          "webhook"
        ]
      },
      {
        "text": "Practical experience with machine learning fundamentals — regression models, feature selection, preprocessing and data visualisation — applied to a real-world student wellbeing dataset.",
        "tags": [
          "machine learning",
          "ml",
          "data science",
          "regression",
          "prediction",
          "sklearn",
          "scikit",
          "numpy",
          "pandas",
          "modelling"
        ]
      },
      {
        "text": "Proven ability to deliver measurable results under pressure; contributed to a record-breaking production shift (266,000 units, +15% on previous record).",
        "tags": [
          "pressure",
          "operational",
          "operations",
          "kpi",
          "targets",
          "performance",
          "lean",
          "process improvement"
        ]
      },
      {
        "text": "Experience working in regulated, compliance-driven environments and collaborating with cross-functional stakeholders.",
        "tags": [
          "regulated",
          "compliance",
          "regulated environment",
          "gdpr",
          "iso",
          "cross-functional",
          "stakeholder"
        ]
      }
    ]
  },
  "cvBody": "EDUCATION\nBachelor of Computer Science — University of Exeter (2021–2024)\nCoursework: Data Structures, Machine Learning Fundamentals, Computer Graphics\nEmphasis: software engineering, algorithm design, unit/integration testing, data analysis\nGCP experience via university: Compute Engine and AI/ML operations\n\nWORK EXPERIENCE\nFreelance Web Developer — Mediq (Healthcare) | Current\n- Expanded and maintained a production healthcare website using TypeScript and Sanity.io\n- Implemented GROQ queries to optimise dynamic content delivery\n- Built backend HTTP request handling services in TypeScript\n- Collaborated with copywriters to ensure compliant content formatting\n\nProduction Operator — Ethypharm UK, Romford | Current\n- Operated pharmaceutical detection and QA systems in a regulated environment\n- Contributed to a record-breaking shift (266,000 ampoules packed — 15% above previous record)\n- Trained 4 operators on quality detection systems\n- Implemented Lean and 5S methodologies to streamline operations\n\nPROJECTS\nTetris Website — Python, HTML, CSS, PHP, JavaScript\nBrowser-playable Tetris with score tracking, leaderboard and MySQL-backed authentication\n\nDissertation: Predictive Modelling — Python, Data Analysis & Visualisation\nLinear regression and random forest models; feature selection, preprocessing, model visualisation\n\nCOVID-19 Real-Time News Dashboard\nLive data news feed displaying real-time pandemic statistics\n\nTECHNICAL SKILLS\nLanguages: Python (Intermediate), TypeScript (Beginner), JavaScript (Beginner), HTML/CSS (Intermediate), C++ (Beginner)\nFrameworks: Django, Node.js (HTTP services), CMS architectures, MySQL, Pandas, MatPlotLib\nTools: Git, Linux, Command Line, Sanity.io, GROQ, GCP (Compute Engine, BigQuery)\nConcepts: REST APIs, Backend Dev, Frontend Dev, Machine Learning Fundamentals, Data Visualisation, OOP (Java)",
  "coverTemplate": "Dear Hiring Manager,\n\nI am applying for the ____ position at ____. I am a Computer Science graduate with hands-on experience building full-stack and backend-driven applications, with a particular focus on API development, database systems and scalable content platforms.\n\nIn my recent freelance work within the healthcare sector, I expanded and maintained a production website using TypeScript and a headless CMS architecture powered by Sanity.io. I implemented GROQ queries for dynamic delivery, and built HTTP services to support frontend data consumption. This work built upon my understanding of API design and collaboration with copywriters in a regulated environment.\n\nFurthermore, I have developed several backend-focused academic and personal projects. I built a browser-playable game of Tetris featuring a MySQL leaderboard system with authentication through a login system and score ranking logic, combining database design with interactive frontend gameplay. For my dissertation, I created predictive models using Python and scikit-learn, implementing linear regression and random forest models to predict how students perceive their stress levels during university. This included feature preprocessing and evaluating model performance across structured datasets that I curated myself.\n\nMy broader experience includes object-oriented programming in Java through pair-programming software projects, as well as real-time dashboard developments utilising API integration. These experiences have strengthened my foundations in algorithm design, data handling, and system architecture. I am particularly interested in continuing to grow in backend and cloud-based environments.\n\nBeyond technical experience, I bring strong collaboration and communication skills due to my freelance work and prior tutoring experience. I am confident in understanding the goals of stakeholders and clients and translating these into technical implementations within team environments to ensure reliable software solutions are made.\n\nI am especially drawn to ____ due to ____, and I am excited by the opportunity to contribute to ___ and to continue to develop as an engineer. I am fully willing to relocate to Finland and can do so on short notice.\n\nThank you for your time and consideration, I look forward to the opportunity to discuss how my experience aligns with the goals of your team.\n\nSincerely,\nTaariq Fadhil"
};

const PROFILE_KEY = 'tf_profile';

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_PROFILE, ...saved, summary: { ...DEFAULT_PROFILE.summary, ...(saved.summary || {}) } };
    }
  } catch (e) { console.warn('Saved profile unreadable, using defaults', e); }
  return structuredClone(DEFAULT_PROFILE);
}

function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function resetProfile() {
  localStorage.removeItem(PROFILE_KEY);
  return structuredClone(DEFAULT_PROFILE);
}

let profile = loadProfile();

function contactLine(p = profile) {
  return [p.phone, p.email, p.github, p.linkedin].filter(Boolean).join(' | ');
}

// ── SUMMARY BULLETS ─────────────────────────────────────
// intro           — always first
// stackVariants   — best-matching variant second ('default' tag = fallback)
// softSkills      — always third
// cloudVariants   — added if the JD hits any cloudTriggers
// conditional     — added when the JD matches their tags, up to maxBullets

// Whole-word match so short tags like 'ai', 'ml' or 'bi' don't fire on
// 'maintain', 'html' or 'ability'
function hasTag(jd, tag) {
  const esc = tag.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + esc + '(?![a-z0-9])').test(jd);
}

// First non-default variant whose tags match wins; otherwise the 'default' one
function pickVariant(pool, jd) {
  for (const v of pool || []) {
    if (v.tags.includes('default')) continue;
    if (v.tags.some(tag => hasTag(jd, tag))) return v.text;
  }
  return (pool || []).find(v => v.tags.includes('default'))?.text || '';
}

function buildSummary(jobText, p = profile) {
  const jd = (jobText || '').toLowerCase();
  const s = p.summary || {};
  const max = s.maxBullets || 5;
  const bullets = [];

  if (s.intro) bullets.push(s.intro);
  const stack = pickVariant(s.stackVariants, jd);
  if (stack) bullets.push(stack);
  if (s.softSkills) bullets.push(s.softSkills);

  const matched = (s.conditional || []).filter(b => b.tags.some(tag => hasTag(jd, tag)));
  if ((s.cloudTriggers || []).some(t => hasTag(jd, t))) {
    const cloud = pickVariant(s.cloudVariants, jd);
    if (cloud) matched.unshift({ text: cloud });
  }

  const added = new Set(bullets);
  for (const b of matched) {
    if (bullets.length >= max) break;
    if (!added.has(b.text)) { bullets.push(b.text); added.add(b.text); }
  }
  return bullets.map(b => `- ${b}`).join('\n');
}

// Full CV text for a job: name, contacts, tailored summary, then the CV body
function buildCVData(jobText, p = profile) {
  return `${p.name.toUpperCase()}
${contactLine(p)}

SUMMARY
${buildSummary(jobText, p)}

${p.cvBody.trim()}`;
}
