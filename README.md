# Job Application Bot

A local job application assistant powered by [Ollama](https://ollama.com) LLMs. It generates a tailored CV and cover letter from any job description, scores your fit, checks the output for claims that aren't in your profile, exports to PDF and tracks every application. Everything runs 100% locally, with no API key required.

**▶ [Try the live demo](https://fadhill-taariq.github.io/job-application-bot/)**: runs in demo mode in the browser, no install needed.

![Generated application with fit score and fact check](docs/generate.jpg)

## Features

### Generate Tab
- **Tailored CV**: a keyword-driven summary plus an LLM rewrite that mirrors the job description's priorities
- **Cover letter**: fills in and tailors your own cover letter template for the role and company
- **Job fit score**: rates your match 1–10 with a brief explanation
- **Fact check**: flags any number, technology or unfilled blank in the output that isn't in your profile, highlighted in the text, so a model "improvement" never makes it into an application
- **Edit before export**: the CV and cover letter are editable in place; copy and PDF export use your edited text
- **PDF export**: the CV in a clean two-column Canva-style layout (with a warning if it overflows one page); the cover letter as a formatted A4 document
- **Log as Applied**: sends the application straight to the tracker

![Fact check highlighting technologies that aren't in the profile](docs/fact-check.jpg)

### Profile Tab
- **One source of truth**: name, contact details, the skills used for scoring, summary bullet rules, CV body and cover letter template all live in one profile
- Edit everything in the browser (saved in `localStorage`), or change the defaults in [`js/profile.js`](js/profile.js)
- Export / import the profile as JSON for backups or another machine
- Tailoring rules (stack variants, cloud bullet, conditional bullets) are editable as JSON, with whole-word tag matching

![Profile tab](docs/profile.jpg)

### Job Scraper Tab
- Search demo job listings, each scored against your profile
- Filter by role type (Developer, Data, Backend, Graduate, Remote)
- Minimum fit score threshold slider
- One-click to load any listing into the Generate tab

![Job scraper](docs/scraper.jpg)

### Tracker Tab
- Logs every application you submit with role, company, fit score, date and status
- Stats dashboard: total applied, average fit score, this week's count, top role type
- Persists across sessions via `localStorage`
- Remove individual entries

## Quick Setup

**1. Install Ollama**

- **Windows / Mac:** download the installer from [ollama.com/download](https://ollama.com/download)
- **Linux:**
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

**2. Pull a model** (pick one)
```bash
ollama pull llama3      # 4.7 GB — best quality
ollama pull mistral     # 4.1 GB — fast & reliable
ollama pull phi3        # 2.3 GB — lightweight
```

**3. Start Ollama with browser access (CORS)**

Windows (PowerShell):
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

Mac / Linux:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

If you get "address already in use", Ollama is already running in the background. Quit it from the system tray / menu bar and run the command again. Keep this window open while using the app.

**4. Open the app**

Extract the zip (or clone the repo), then open `index.html` in your browser. There's no build step and no server needed.

**5. Set up your profile**

Open the **Profile** tab and replace the details with your own: contact info, skills summary, CV body and cover letter template. Click **Save Profile**.

## Demo Mode

Without Ollama, the app can run in demo mode: add `?demo` to the URL, click **Try demo mode instead** in the setup box, or open the hosted version (it switches automatically when no local model answers). The CV summary still uses the real keyword rules; the fit score and cover letter use simple deterministic stand-ins instead of an LLM.

## How It Works

The app makes three focused Ollama API calls per generation:

| Call | Task | Output |
|------|------|--------|
| 1 | Score job fit + extract keywords | JSON: score, reason, keywords |
| 2 | Rewrite CV to match JD | Plain text tailored CV |
| 3 | Tailor cover letter template | Plain text cover letter |

Each call is small and focused, so local models handle them reliably. The results are then fact-checked against your profile: any number, technology or tool in the output that doesn't appear in your profile is flagged for review.

## Tech Stack

- Vanilla HTML / CSS / JavaScript: zero dependencies, zero build tooling
- [Ollama](https://ollama.com): local LLM inference (llama3, mistral, phi3, etc.)
- [jsPDF](https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js): client-side PDF generation
- `localStorage`: profile and application tracker persistence

## File Structure

```
index.html          # Page markup — open this in your browser
css/styles.css      # Styles
js/profile.js       # Default profile + summary tailoring rules + CV builder
js/factcheck.js     # Flags output that isn't supported by the profile
js/demo.js          # Demo mode (no Ollama needed)
js/app.js           # Generation, PDF export, scraper, tracker, Profile tab
docs/               # README screenshots
```

## Notes

- Demo job listings are included for testing without a live job API
- For live job listings, free API keys are available from [Adzuna](https://developer.adzuna.com) and [Reed](https://www.reed.co.uk/developers/jobseeker)
- The fact check catches new numbers and technology names, not every reworded claim, so always read the output before sending
