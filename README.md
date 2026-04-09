# 🧠 Cortex OS — Your Second Brain

A unified personal OS combining thought capture, markdown notes, daily journaling, finance tracking, and task management — all in one app, deployable to GitHub Pages.

---

## What's Inside

| Module | Description |
|---|---|
| **Dashboard** | Overview of all modules — stats, today's snapshot, alerts |
| **Thoughts** | Rapid thought capture with 14 block types (idea, reflection, learning, win, decision, goal…) |
| **Notes** | GitHub-synced Markdown editor with backlinks, tags, and knowledge graph |
| **Journal** | Daily journal with mood tracking, gratitude, intentions, and full-text search |
| **Finance** | Income/expense tracker with monthly charts, savings goals, and savings rate |
| **Tasks** | PARA-method Kanban board (Projects, Areas, Resources, Archive) |

---

## Quick Start

```bash
# Clone or download the repo
npm install
npm run dev
```

Open http://localhost:5173

---

## Deploy to GitHub Pages

1. Push to a GitHub repo
2. Go to **Settings → Pages → Source → GitHub Actions**
3. The `deploy.yml` workflow will build and deploy automatically on every push to `main`

Your app will be live at `https://<username>.github.io/<repo>/`

---

## Notes Module — GitHub Sync Setup

Your notes are stored as Markdown files in a GitHub repository:

1. Create a **new GitHub repo** (e.g. `my-notes`)
2. Generate a **Personal Access Token** (Settings → Developer Settings → Tokens) with `repo` scope
3. In the app: **Notes → Settings icon** → enter your PAT, username, and repo name
4. Click **Sync** — your notes will load

All notes are auto-saved to GitHub with 1.2s debounce.

---

## Finance Module

- Add income and expenses via the **+ Add** button
- Transactions are stored in `localStorage` (private, never leaves your device)
- Charts update in real time
- Default currency: **BDT** (changeable in store)
- Supports savings goals with progress tracking

---

## Data Storage

| Module | Storage |
|---|---|
| Notes | GitHub (synced) |
| Thoughts, Journal, Finance, Tasks | localStorage (private) |

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — fast builds, GitHub Pages compatible
- **Zustand** — state management with localStorage persistence
- **Tailwind CSS** — with warm dark theme
- **Framer Motion** — animations
- **Recharts** — finance charts
- **Radix UI** — accessible components

---

## Keyboard Shortcuts (Thoughts)

| Key | Action |
|---|---|
| `/idea <text>` | Capture as Idea 💡 |
| `/reflect <text>` | Capture as Reflection 🪞 |
| `/learn <text>` | Capture as Learning 🎓 |
| `/goal <text>` | Capture as Goal 🎯 |
| `/win <text>` | Capture as Win 🏆 |
| `/decide <text>` | Capture as Decision ⚖️ |
| `/task <text>` | Capture as Task ✅ |
| `/quote <text>` | Capture as Quote 💬 |
| `?<text>` | Auto-detects as Question ❓ |
| `Enter` | Submit |
| `Shift+Enter` | New line |
| `/` (empty) | Toggle shortcut hints |

---

Made with ❤️ — your private second brain.
