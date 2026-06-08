# ⬡ Daily Productivity Analyzer

A powerful, beautiful productivity tracking app with AI-powered insights via Gemini API.

## Features

- ✅ **Punch In / Punch Out** — Track work sessions with precise timestamps
- ✅ **Daily Task Logger** — Log activities by category (Work, Learning, Health, Personal, Creative, Admin)
- ✅ **Productivity Score** — Auto-calculated daily score based on tasks, time & diversity
- ✅ **2-Hour Notifications** — Browser reminders to log what you've done (configurable interval)
- ✅ **AI Insights** — Powered by Gemini: daily analysis, recommendations, monthly review
- ✅ **Monthly Heatmap** — Visual calendar showing your productivity every day
- ✅ **Category Breakdown** — See where you spend your time monthly
- ✅ **Productivity Streak** — Consecutive productive days counter
- ✅ **Export Data** — Download all your data as JSON
- ✅ **Works Offline** — All data saved locally in your browser

## Quick Start

### Option 1: Open Locally
Just open `index.html` in your browser. No server needed!

### Option 2: Deploy on GitHub Pages (Free)

1. Create a new GitHub repository
2. Push this code:
```bash
cd daily-productivity-analyzer
git init
git add .
git commit -m "Initial commit: Daily Productivity Analyzer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-productivity-analyzer.git
git push -u origin main
```
3. Go to your repo → **Settings** → **Pages** → Source: `GitHub Actions`
4. The workflow auto-deploys. Your app will be live at:
   `https://YOUR_USERNAME.github.io/daily-productivity-analyzer`

### Option 3: Deploy on Netlify (Free)
1. Go to [netlify.com](https://netlify.com)
2. Drag & drop the project folder
3. Done! Live in seconds.

### Option 4: Deploy on Vercel (Free)
```bash
npm i -g vercel
cd daily-productivity-analyzer
vercel
```

## Gemini API Setup

1. Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a free API key
3. In the app → **Settings** → paste your key → Save
4. AI features will now work:
   - Daily insights (Dashboard → ↻ Refresh)
   - Recommendations (Dashboard → ✦ Get Recommendations)
   - Monthly analysis (Monthly → Get AI Analysis)
   - 2-hour check-in analysis

## Where is Data Stored?

All data is stored in your **browser's localStorage** under keys prefixed with `dpa_`. This means:
- ✅ Completely private — only on your device
- ✅ No account needed
- ✅ Works offline
- ⚠️ Clearing browser data will erase it → use Export to back up

## Data Keys
| Key | Contents |
|-----|----------|
| `dpa_tasks_YYYY-MM-DD` | Tasks for each day |
| `dpa_sessions_YYYY-MM-DD` | Punch in/out sessions |
| `dpa_day_YYYY-MM-DD` | Daily score summary |
| `dpa_profile` | Your name, role, goal hours |
| `dpa_geminiKey` | Your Gemini API key |
| `dpa_notifEnabled` | Notification preference |

## Tech Stack
- Pure HTML + CSS + JavaScript (no framework, no build step)
- Gemini 1.5 Flash API for AI features
- localStorage for data persistence
- Browser Notifications API for 2-hour reminders
