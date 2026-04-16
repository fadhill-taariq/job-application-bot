# Job Application Bot

A local, single-file job application assistant powered by [Ollama](https://ollama.com) LLMs. Generates tailored CVs and cover letters from any job description, scores your fit, exports to PDF, and tracks every application — all running 100% locally with no API key required.

## Features

### Generate Tab
- **Tailored CV** — rewrites your CV to mirror the job description's keywords and priorities
- **Cover letter** — generates a personalised letter matching the role and company
- **Job fit score** — rates your match 1–10 with a brief explanation
- **Keyword pills** — surfaces the exact terms from the JD used in your application
- **PDF export** — exports CV in a clean two-column Canva-style layout; cover letter as a formatted A4 document
- **Log as Applied** — sends the application straight to the tracker

### Job Scraper Tab
- Search demo job listings scored in real-time against your profile
- Filter by role type (Developer, Data, Backend, Graduate, Remote)
- Minimum fit score threshold slider
- One-click to load any listing into the Generate tab

### Tracker Tab
- Logs every application you submit with role, company, fit score, date and status
- Stats dashboard: total applied, average fit score, this week's count, top role type
- Persists across sessions via `localStorage`
- Remove individual entries

## Quick Setup

**1. Install Ollama**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```
Or download from [ollama.com](https://ollama.com) (Mac / Windows / Linux)

**2. Pull a model** (pick one)
```bash
ollama pull llama3      # 4.7 GB — best quality
ollama pull mistral     # 4.1 GB — fast & reliable
ollama pull phi3        # 2.3 GB — lightweight
```

**3. Start Ollama with browser access (CORS)**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**4. Open the app**

Just open `index.html` in your browser — no build step, no server needed.

## How It Works

The app makes three focused Ollama API calls per generation:

| Call | Task | Output |
|------|------|--------|
| 1 | Score job fit + extract keywords | JSON: score, reason, keywords |
| 2 | Rewrite CV to match JD | Plain text tailored CV |
| 3 | Tailor cover letter template | Plain text cover letter |

Each call is small and focused so local models handle them reliably without hallucinating.

## Tech Stack

- Vanilla HTML / CSS / JavaScript — zero dependencies, zero build tooling
- [Ollama](https://ollama.com) — local LLM inference (llama3, mistral, phi3, etc.)
- [jsPDF](https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js) — client-side PDF generation
- `localStorage` — persistent application tracker

## File Structure

```
index.html    # The entire app — open this in your browser
README.md
```

## Notes

- The CV template and profile data are embedded directly in `index.html` — edit the `buildCVData()` and `STACK_VARIANTS` sections to customise for your own background
- Demo job listings are included for testing without a live job API
- For live job listings, free API keys are available from [Adzuna](https://developer.adzuna.com) and [Reed](https://www.reed.co.uk/developers/jobseeker)
