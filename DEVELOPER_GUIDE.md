# MB Notetaker — Developer Guide

Complete technical reference for onboarding developers. Covers the full tech stack, every library and why it was chosen, the folder structure, data flow, API integrations, and deployment.

---

## Table of Contents

1. [What Is This App?](#1-what-is-this-app)
2. [Tech Stack Overview](#2-tech-stack-overview)
3. [Libraries & Why Each Was Chosen](#3-libraries--why-each-was-chosen)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Environment Variables](#5-environment-variables)
6. [How the App Starts (Boot Flow)](#6-how-the-app-starts-boot-flow)
7. [Authentication](#7-authentication)
8. [Data Layer — Firebase Firestore](#8-data-layer--firebase-firestore)
9. [Local Storage Usage](#9-local-storage-usage)
10. [Recording Pipeline](#10-recording-pipeline)
11. [AI Summary Generation (Groq)](#11-ai-summary-generation-groq)
12. [Daily Work Summary](#12-daily-work-summary)
13. [Page-by-Page Breakdown](#13-page-by-page-breakdown)
14. [Component Breakdown](#14-component-breakdown)
15. [State Management Strategy](#15-state-management-strategy)
16. [Navigation (No Router)](#16-navigation-no-router)
17. [Styling System](#17-styling-system)
18. [Deployment (GitHub Pages + CI/CD)](#18-deployment-github-pages--cicd)
19. [Dev Commands](#19-dev-commands)
20. [Common Gotchas](#20-common-gotchas)

---

## 1. What Is This App?

**MB Notetaker** is a browser-based meeting productivity tool. Users can:

- Record meetings with microphone (+ system audio)
- Get a live transcript with speaker detection (who said what)
- Auto-generate an AI-structured summary (objective, topics, insights, decisions, action items)
- Organise meetings inside project folders
- Keep a project-scoped To-Do list
- View a Daily Work Summary across all projects
- Write freeform workspace notes with a rich text editor

**Live URL:** `https://pavankshirsagar-web.github.io/mb-notetaker/`

---

## 2. Tech Stack Overview

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19.x |
| Build Tool | Vite | 8.x |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui | — |
| Icon Library | Lucide React | 1.x |
| Rich Text Editor | Tiptap | 3.x |
| Auth + Database | Firebase (Auth + Firestore) | 12.x |
| Speech-to-Text | Deepgram SDK | 5.x |
| AI Summaries | Groq API (`llama-3.3-70b-versatile`) | — |
| Package Manager | npm | — |
| Deployment | GitHub Pages via GitHub Actions | — |

---

## 3. Libraries & Why Each Was Chosen

### React 19
**What:** JavaScript UI library for building component-based interfaces.
**Why:** Industry standard. The entire UI is broken into reusable components. React's `useState` and `useEffect` manage all local UI state.

---

### Vite 8
**What:** Next-generation frontend build tool and dev server.
**Why:** Extremely fast — starts the dev server in milliseconds using native ES modules. `npm run dev` is instant compared to Webpack-based tools. Also handles `.env` variable injection via `import.meta.env`.

---

### Tailwind CSS 4 (with `@tailwindcss/vite`)
**What:** Utility-first CSS framework. You apply small CSS classes directly in JSX instead of writing separate CSS files.
**Why:** No CSS files to manage. Styles live right next to the markup. Tailwind v4 is configured via `src/index.css` using `@theme inline` — there is **no** `tailwind.config.js` file.
**Example:** `className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100"`

---

### shadcn/ui
**What:** A collection of accessible, copy-paste React components built on Radix UI primitives.
**Why:** Used specifically for the `DropdownMenu` (the `⋯` project context menu in the workspace editor). It handles keyboard navigation, focus trapping, and accessibility out of the box.
**File:** `src/components/ui/dropdown-menu.jsx`

---

### Lucide React
**What:** Open-source icon library with 1000+ SVG icons as React components.
**Why:** Consistent, clean line icons. Every icon in the app comes from Lucide — nothing else. Used as `<Pencil size={13} />`.

---

### Tiptap 3
**What:** Headless rich text editor framework built on ProseMirror.
**Why:** The Workspace tab in each project needs a full document editor — bold, italic, tables, images, file attachments, YouTube embeds, links, code blocks. Tiptap provides all of this via extensions.
**Extensions used:**
- `StarterKit` — bold, italic, headings, bullet lists, ordered lists, blockquote, code, history
- `Underline` — underline formatting
- `Image` — inline image embeds
- `Link` — hyperlinks
- `Table` + `TableRow` + `TableHeader` + `TableCell` — full table editing
- `Youtube` — YouTube video embed
- `TextAlign` — left/center/right alignment
- `Placeholder` — grey placeholder text when editor is empty
- Custom `FileAttachment` node — drag-and-drop file attachments (PDF, DOCX preview)

---

### Firebase 12
**What:** Google's backend-as-a-service platform.
**Why:** The app needs user authentication and persistent data storage without building a custom backend.

Two Firebase services are used:

| Service | Purpose |
|---|---|
| **Firebase Auth** | Google OAuth login. Users sign in with their Google account. |
| **Firestore** | NoSQL cloud database. Stores projects and meetings per user. |

**File:** `src/lib/firebase.js`

---

### Deepgram SDK 5
**What:** Real-time speech-to-text API. Converts microphone audio into text with speaker labels.
**Why:** Industry-leading accuracy for live transcription. Supports speaker diarization (tells you who said what: "Speaker 1", "Speaker 2"). Returns results as streaming JSON.
**Key feature used:** WebSocket streaming with `nova-3` model + `diarize: true`.

---

### Groq API (`llama-3.3-70b-versatile`)
**What:** A free-tier AI inference API running Meta's Llama 3.3 70B model on custom hardware (LPU chips).
**Why:**
- Free tier: 1,000 requests/day for the 70B model
- Extremely fast inference (~500 tokens/sec)
- High quality structured JSON output for meeting summaries
- OpenAI-compatible REST API — simple to use
**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`

---

## 4. Project Folder Structure

```
AI Notetaker/
│
├── .env                        # API keys (never commit to git)
├── .gitignore
├── index.html                  # Single HTML entry point — contains <div id="root">
├── package.json                # npm dependencies and scripts
├── vite.config.js              # Vite build config (base path, aliases, plugins)
├── CLAUDE.md                   # Product spec and coding instructions for AI assistants
├── DEVELOPER_GUIDE.md          # This file
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD — auto-deploys on push to main
│
├── public/
│   └── favicon.svg             # Browser tab icon
│
└── src/
    ├── main.jsx                # React entry point — mounts <App /> into #root
    ├── App.jsx                 # ROOT component — all global state, API calls, navigation
    ├── App.css                 # (unused/minimal)
    ├── index.css               # Tailwind v4 directives + global font (Inter)
    │
    ├── assets/
    │   ├── hero.png            # Login page illustration
    │   └── ...
    │
    ├── lib/
    │   ├── firebase.js         # Firebase init, auth helpers, Firestore instance
    │   └── utils.js            # Tailwind class merge utility (cn function)
    │
    ├── components/
    │   ├── Sidebar.jsx         # Left navigation + ProjectsTab + DailySummaryTab
    │   ├── RecordingSetupModal.jsx   # Microphone selection + system audio toggle modal
    │   ├── FloatingRecordingWidget.jsx  # In-app floating recording controls
    │   ├── PiPWidget.jsx       # Chrome Picture-in-Picture window controls
    │   └── ui/
    │       └── dropdown-menu.jsx  # shadcn/ui DropdownMenu (Radix UI)
    │
    └── pages/
        ├── LoginPage.jsx       # Sign-in screen (Google OAuth)
        ├── Dashboard.jsx       # Home screen (recent meetings, quick actions)
        ├── ProjectPage.jsx     # Project detail — Recordings / Workspace / To-Do tabs
        ├── MeetingDetail.jsx   # Meeting transcript + AI summary side-by-side view
        ├── RecordingSetup.jsx  # (legacy) Standalone recording setup page
        ├── WorkspacePageEditor.jsx   # Tiptap rich text editor for workspace notes
        └── WorkspaceFolderPage.jsx   # Workspace folder browser
```

### Key Principle: Where Does Logic Live?

| Type of logic | Where it lives |
|---|---|
| Global state (projects, meetings, current user) | `App.jsx` |
| API calls (Firestore read/write, Groq, Deepgram) | `App.jsx` |
| Navigation between pages | `App.jsx` (`page` state) |
| UI-only state (which tab is open, hover, modal open) | Inside each page/component |
| Sidebar tabs content | `Sidebar.jsx` (exported as `GlobalTodoTab`, `DailySummaryTab`) |

---

## 5. Environment Variables

These are stored in `.env` at the project root. **Never commit this file to Git.**

```env
# Speech-to-text (Deepgram)
VITE_DEEPGRAM_API_KEY=...

# AI summary generation (Groq)
VITE_GROQ_API_KEY=...

# Firebase project credentials
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**How to access in code:**
```js
const apiKey = import.meta.env.VITE_GROQ_API_KEY
```

> **Important:** Variables must start with `VITE_` to be exposed to the browser by Vite. Other prefixes are stripped at build time.

**For GitHub Pages deployment**, these same keys must be added as **GitHub repository secrets** (Settings → Secrets and variables → Actions). The `deploy.yml` workflow reads them during the build step.

---

## 6. How the App Starts (Boot Flow)

```
index.html  →  main.jsx  →  App.jsx
```

1. **`index.html`** — The only HTML file. Contains `<div id="root"></div>`.
2. **`main.jsx`** — Calls `createRoot(document.getElementById('root')).render(<App />)`.
3. **`App.jsx`** — On mount:
   - Calls `listenAuthState(callback)` from Firebase
   - If no user → renders `<LoginPage />`
   - If user logged in → loads their projects + meetings from Firestore
   - Sets `page = 'dashboard'` and renders the appropriate page component

---

## 7. Authentication

**File:** `src/lib/firebase.js`

- Uses **Firebase Authentication** with **Google OAuth**
- When the user clicks "Continue with Google", `signInWithGoogle()` opens a popup
- Firebase returns a `user` object with `uid`, `email`, `displayName`, `photoURL`
- `onAuthStateChanged` listener (wrapped as `listenAuthState`) keeps the auth state in sync across page refreshes
- All Firestore data is scoped to `users/{uid}/...`

**Sign out flow:**
1. User clicks profile avatar in sidebar
2. Logout confirmation modal appears (with "Your work is saved automatically" message)
3. On confirm → `signOutUser()` → Firebase clears session → `App.jsx` sets `currentUser = null` → Login page shown

---

## 8. Data Layer — Firebase Firestore

**Firestore** is a NoSQL cloud database. Data is stored as **documents** inside **collections**.

### Data Structure

```
Firestore
└── users/
    └── {userId}/              ← one document per signed-in user
        ├── projects/
        │   └── {projectId}/   ← one document per project
        │       Fields: id, name, color, createdAt
        │
        └── meetings/
            └── {meetingId}/   ← one document per meeting
                Fields:
                  id           - unique string (Date.now())
                  projectId    - links to a project
                  projectName  - denormalized for display
                  title        - meeting name
                  date         - "April 9, 2026"
                  dateKey      - "2026-04-09" (for grouping)
                  time         - "11:26 AM"
                  duration     - "14:49"
                  language     - "English"
                  transcript   - array of { id, speaker, text, color }
                  summary      - object { objective, topicsDiscussed, keyInsights,
                                          decisionsMade, actionItems, _generating, _failed }
                  speakerNames - object { "Speaker 1": "John" } (rename map)
```

### Helper Functions in App.jsx

```js
// Save a project to Firestore
fsSaveProject(uid, project)

// Delete a project and all its meetings
fsDeleteProject(uid, projectId, meetings)

// Save/update a meeting
fsSaveMeeting(uid, meeting)

// Delete a meeting
fsDeleteMeeting(uid, meetingId)

// Load all projects + meetings on login
// Uses getDocs(collection(db, 'users', uid, 'projects'))
```

---

## 9. Local Storage Usage

Some data is stored in the **browser's localStorage** (not Firestore) for fast, offline access:

| Key | Content | Used by |
|---|---|---|
| `todos_{projectId}` | `{ [dateKey]: Task[] }` — project-scoped to-do items | ProjectPage To-Do tab, MeetingDetail action items |
| `todos_personal` | `{ [dateKey]: Task[] }` — personal tasks (not tied to a project) | GlobalTodoTab in Sidebar |
| `daily_summary_{dateKey}` | Generated daily summary object | DailySummaryTab in Sidebar |
| `mb_notetaker_autosave` | Autosaved recording in progress | App.jsx recovery logic |

### Why localStorage for Todos (Not Firestore)?
Todos are lightweight, frequently updated, and project-scoped. localStorage gives instant read/write without network latency. The trade-off is that todos don't sync across devices.

---

## 10. Recording Pipeline

This is the most complex part of the app. Here's the full flow:

```
User clicks "New Recording"
    → RecordingSetupModal opens (mic selection + system audio toggle)
    → User clicks "Start Recording"
    → App.jsx: getUserMedia() captures mic stream
    → Deepgram WebSocket opens (nova-3 model, diarize: true)
    → Audio chunks streamed to Deepgram in real-time
    → Deepgram returns JSON with transcript + speaker labels
    → App.jsx: transcript lines added to recLines state
    → FloatingRecordingWidget shows live controls
    → PiPWidget opens in browser Picture-in-Picture window

User clicks "Stop"
    → handleEndRecording() called
    → buildMeeting(lines) creates meeting object
    → Meeting saved to Firestore immediately (with _generating: true on summary)
    → Navigation → MeetingDetail page
    → generateAISummary(lines) called in background (Groq API)
    → On completion → meeting updated with AI summary
```

### Speaker Detection

Deepgram returns a `speaker` number (0, 1, 2...) for each word. The app maps these to speaker labels:

```js
const SPEECH_SPEAKERS = [
  { id: 'You',       color: '#7133AE' },  // speaker 0 = the recording user
  { id: 'Speaker 1', color: '#6366F1' },  // speaker 1
  { id: 'Speaker 2', color: '#0891B2' },  // speaker 2
  // ...
]
```

Users can rename "Speaker 1" → "John" in the MeetingDetail rename panel.

### Hindi/Marathi Transliteration

If Deepgram returns Devanagari script (Hindi/Marathi), the app automatically converts it to phonetic English (Latin characters) using a built-in character map in `App.jsx`.

Example: `"क्या हाल है"` → `"kya haal hai"`

---

## 11. AI Summary Generation (Groq)

**File:** `App.jsx` → `generateAISummary(lines)` function

### Flow

1. Takes the transcript lines (capped at 200 lines to stay within token limits)
2. Formats them as `"Speaker: text"` pairs
3. Sends a structured prompt to Groq asking for JSON output
4. Parses the returned JSON into the summary structure

### Summary Structure

```js
{
  objective:        "One sentence describing the meeting purpose",
  topicsDiscussed:  ["Topic 1", "Topic 2"],
  keyInsights:      ["Insight 1", "Insight 2"],
  decisionsMade:    ["Decision 1"],
  actionItems:      [
    { id: 1, task: "Write proposal", owner: "", due: "" }
  ],
  _generating: false,  // true while API call is in progress
  _failed:     false,  // true if API call failed
}
```

### Model Used

`llama-3.3-70b-versatile` via Groq API
Temperature: `0.3` (low — consistent, factual output)
Max tokens: `1024`

### Trigger Points

| When | How |
|---|---|
| Recording ends | Automatically, in background |
| Meeting has transcript but no summary | "Generate AI Summary" button in MeetingDetail |
| User wants to regenerate | "Retry Generation" button |

---

## 12. Daily Work Summary

**File:** `src/components/Sidebar.jsx` → `DailySummaryTab` component

This feature lets users generate a daily summary across all their projects.

### How it Works

1. Groups all meetings by date
2. For each day, finds all meetings across all projects
3. Groups meetings by project
4. For each project group, calls Groq API with a simplified prompt
5. Returns bullet points summarising what happened in that project that day
6. Also factors in the to-do list for context

### Storage

Daily summaries are stored in localStorage as `daily_summary_{dateKey}`.

### Re-summarize

The "Re-summarize Day" button (only available for today) regenerates the summary — useful if new meetings or tasks were added after the initial generation.

---

## 13. Page-by-Page Breakdown

### LoginPage (`src/pages/LoginPage.jsx`)
- Two-column layout: left = marketing illustration, right = auth form
- "Continue with Google" button → calls `signInWithGoogle()` from firebase.js
- Email input exists for UI but only Google OAuth is active

---

### Dashboard (`src/pages/Dashboard.jsx`)
- Welcome screen shown after login
- Lists recent meetings across all projects
- "New Recording" CTA in top right
- Quick-access project cards

---

### ProjectPage (`src/pages/ProjectPage.jsx`)
Three tabs:

**Recordings tab** — Lists all meetings for this project, grouped by date
- Each day group shows meeting cards with time, duration, AI summary preview
- "New Recording" button starts recording in this project
- "Summarize Meeting(s)" button appears when a day has 2+ meetings (generates a combined summary)

**Workspace tab** — Tiptap rich text editor
- Full document editor with toolbar
- Supports: bold, italic, underline, headings, bullet lists, tables, images, file attachments, YouTube embeds
- Auto-saves on blur/change

**To-Do tab** — Project-scoped task list
- Tasks grouped by date (Today, Yesterday, older dates)
- Add new tasks with "+ Add Task"
- Inline edit and delete on each task
- Tasks from AI action items flow in here when user marks them "mine"

---

### MeetingDetail (`src/pages/MeetingDetail.jsx`)
Two-panel layout:

**Left panel (40%) — Transcript**
- Scrollable list of transcript lines with speaker avatars
- Speaker rename panel (click Users icon)
- Copy and download transcript buttons

**Right panel (60%) — AI Summary**
- Read-only display of: Objective, Topics Discussed, Key Insights, Decisions Made
- Action Items: checkbox to mark as "mine", then "Add to To-Do list" CTA
- "Generate AI Summary" button if summary is empty but transcript exists
- Copy and download summary buttons

---

### WorkspacePageEditor (`src/pages/WorkspacePageEditor.jsx`)
Full-screen Tiptap editor for a specific workspace page. Accessed from the Workspace tab's file list.

---

## 14. Component Breakdown

### Sidebar (`src/components/Sidebar.jsx`)

The left navigation. Contains three exported pieces:

```js
export default function Sidebar(props) { ... }  // Main nav shell
export function GlobalTodoTab(props) { ... }     // Full-page to-do list
export function DailySummaryTab(props) { ... }   // Full-page daily summary
```

**Sidebar sections:**
1. **Top nav** — "Daily Work Summary" navigation button
2. **Projects list** — Always-visible list of all projects with "PROJECTS" label + "+ Add new"
3. **Bottom** — User profile avatar + logout button

**Portal-rendered elements:**
- Project `⋯` context menu (Rename / Delete) — rendered via `createPortal` into `document.body` to avoid z-index issues
- Logout confirmation modal — also via `createPortal`

---

### RecordingSetupModal (`src/components/RecordingSetupModal.jsx`)
Modal that appears before starting a recording:
- Microphone device selector (lists all available mics, system default at top)
- System audio toggle
- Microphone test (shows live waveform)
- "Start Recording" button

---

### FloatingRecordingWidget (`src/components/FloatingRecordingWidget.jsx`)
In-app draggable floating widget during recording:
- Shows: elapsed time, live waveform, pause/resume, stop buttons
- Appears over any page while recording is active

---

### PiPWidget (`src/components/PiPWidget.jsx`)
Opens a browser **Picture-in-Picture** window (the small floating video-like window):
- Separate small HTML canvas-based window
- Shows recording timer and pause/stop controls
- Communicates back to the main app via `window.postMessage`
- Useful when the user switches tabs during a meeting

---

### `src/components/ui/dropdown-menu.jsx`
shadcn/ui wrapper around Radix UI's `@radix-ui/react-dropdown-menu`. Used in the Workspace tab for the file/page context menus.

---

## 15. State Management Strategy

The app uses **React's built-in state only** — no Redux, no Zustand, no Context API.

### Global State (lives in App.jsx)

```js
// Auth
const [currentUser, setCurrentUser] = useState(null)

// Data
const [projects, setProjects] = useState([])
const [meetings, setMeetings] = useState([])

// Navigation
const [page, setPage] = useState('loading')  // 'loading' | 'dashboard' | 'project' | 'meeting' | 'daily' | ...
const [activeProjectId, setActiveProjectId] = useState(null)
const [activeMeetingId, setActiveMeetingId] = useState(null)

// Recording
const [isRecording, setIsRecording]   = useState(false)
const [isPaused, setIsPaused]         = useState(false)
const [recLines, setRecLines]         = useState([])   // live transcript lines
const [recSeconds, setRecSeconds]     = useState(0)    // elapsed recording time
const [recProject, setRecProject]     = useState(null) // which project is being recorded
```

### Prop Drilling

State is passed down from App.jsx to child components via props. Since the app is not very deep (max 2–3 levels), prop drilling is acceptable here.

Example:
```
App.jsx (owns meetings[])
  └── ProjectPage.jsx (receives meetings via props, filters by projectId)
        └── MeetingCard (receives single meeting via props)
```

---

## 16. Navigation (No Router)

The app uses **no React Router**. Navigation is purely state-based in `App.jsx`:

```js
const [page, setPage] = useState('dashboard')
```

Navigation functions:
```js
const navToDashboard = () => setPage('dashboard')
const navToProject   = (pid) => { setActiveProjectId(pid); setPage('project') }
const navToMeeting   = (mid) => { setActiveMeetingId(mid); setPage('meeting') }
const navToDaily     = ()    => setPage('daily')
```

App.jsx renders the correct page component based on `page`:
```jsx
{page === 'dashboard' && <Dashboard ... />}
{page === 'project'   && <ProjectPage ... />}
{page === 'meeting'   && <MeetingDetail ... />}
{page === 'daily'     && <DailySummaryTab ... />}
```

**Why no React Router?** The app was built with simplicity in mind. Since it's a single-user desktop web app (not a shareable-URL product), URL-based routing was not needed. Navigation is instant.

---

## 17. Styling System

### Tailwind CSS v4

All styles are written as Tailwind utility classes directly in JSX. There is **no separate CSS file** for components.

```jsx
// Example from MeetingDetail.jsx
<div className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50">
```

### Global Styles (`src/index.css`)

```css
@import "tailwindcss";

@theme inline {
  --font-sans: 'Inter', sans-serif;
  /* Custom brand color tokens can be added here */
}
```

### Brand Colors

| Token | Hex | Usage |
|---|---|---|
| Brand purple | `#7133AE` | Primary CTAs, active states, brand accent |
| Purple light bg | `#7133AE12` | Icon backgrounds, highlighted chips |
| Purple border | `#7133AE30` | Outlined buttons |

These are used as inline `style` props (not Tailwind classes) because Tailwind's JIT doesn't generate arbitrary hex values by default.

### Inline Styles vs Tailwind
- **Tailwind classes** → standard spacing, layout, sizing, standard colors (gray, white, etc.)
- **Inline `style` props** → brand purple color `#7133AE` and its opacity variants

---

## 18. Deployment (GitHub Pages + CI/CD)

### Vite Config

```js
// vite.config.js
export default defineConfig({
  base: "/mb-notetaker/",   // must match GitHub Pages repo path
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

The `base: "/mb-notetaker/"` is critical — without it, assets load from `/` and break on GitHub Pages.

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

Triggered on every push to `main`:

1. Checks out the code
2. Sets up Node 20
3. Runs `npm ci` (clean install)
4. Runs `npm run build` — injects secrets as `VITE_*` environment variables
5. Uploads the `dist/` folder as a GitHub Pages artifact
6. Deploys to GitHub Pages

### Adding GitHub Secrets

Go to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add all keys from `.env`:
- `VITE_DEEPGRAM_API_KEY`
- `VITE_GROQ_API_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

## 19. Dev Commands

```bash
# Install dependencies (first time or after pulling changes)
npm install

# Start dev server at http://localhost:5173
npm run dev

# Production build (outputs to /dist)
npm run build

# Preview the production build locally
npm run preview

# Run ESLint for code quality checks
npm run lint
```

### Alias Resolution

The `@` alias in imports resolves to `src/`:
```js
import { DropdownMenu } from '@/components/ui/dropdown-menu'
// same as:
import { DropdownMenu } from '../components/ui/dropdown-menu'
```

---

## 20. Common Gotchas

### 1. Vite env variables not loading
- Variable names must start with `VITE_`
- After editing `.env`, **restart** `npm run dev` — HMR doesn't pick up `.env` changes

### 2. Firebase not working locally
- Make sure all 6 `VITE_FIREBASE_*` variables are in `.env`
- If `firebaseConfigured` is `false`, the app shows login but can't actually auth
- Check `src/lib/firebase.js` — it logs a warning if config is missing

### 3. Groq API returning nothing / `_failed: true`
- Check `VITE_GROQ_API_KEY` is set in `.env`
- The key check: `if (!apiKey || apiKey === 'your_groq_api_key_here') return EMPTY_SUMMARY`
- Model in use: `llama-3.3-70b-versatile` — do not change to another model name

### 4. Daily summary shows "Updated X:XX PM" but no content
- Old empty summary is cached in localStorage
- Click "Re-summarize Day" to regenerate

### 5. GitHub Pages shows blank page after deploy
- Check that `base: "/mb-notetaker/"` in `vite.config.js` matches the repo name exactly
- Check GitHub Actions logs for build errors (usually missing secrets)

### 6. `createPortal` usage
- The project `⋯` menu and the logout confirmation modal use `createPortal(jsx, document.body)`
- This renders them outside the normal React tree — they appear above everything regardless of parent `overflow: hidden` or `z-index` constraints

### 7. Transcript capped at 200 lines
- `generateAISummary` only sends `lines.slice(0, 200)` to Groq
- Long meetings (1+ hour) will have their summary based on the first ~200 spoken segments
- This is intentional to stay within Groq's token limits

### 8. `speakerNames` rename map
- Stored as `{ "Speaker 1": "John", "You": "Pavan" }` inside each meeting
- Only stored for overrides — if a speaker has no rename, the original ID is displayed
- Applied in `displayName(speakerId)` helper in MeetingDetail

---

*Last updated: April 2026*
