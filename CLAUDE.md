# AI Note Taker – Meeting Transcription & Summary Tool

## Product Overview
AI Note Taker is a web-based productivity application for office employees to record meetings, generate live transcriptions, and create AI-powered meeting summaries. It helps users capture conversations and organize them inside project folders.

**Primary Users:**
- Product managers
- Designers
- Developers
- Team leads
- Office employees attending frequent meetings

---

## Tech Stack
- **Frontend:** React (Vite)
- **Component Library:** shadcn/ui
- **Icon Library:** Lucide Icons
- **Package Manager:** npm

## Dev Commands
- `npm run dev` — start development server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

---

## Core Features
1. Project folders
2. Private and shared projects
3. Live meeting transcription
4. AI-generated meeting summaries
5. Speaker detection
6. Global speaker rename
7. Recording controls (pause / resume / stop)
8. Floating Picture-in-Picture recording controls
9. Microphone selection
10. Microphone testing
11. Automatic language detection
12. Meeting organization by project and date
13. Export meeting summaries and transcripts
14. Autosave recording safety

---

## Application Structure

### Main Sections
- Dashboard
- Projects
- Meetings
- Recording Screen
- Meeting Detail
- Summary Editor
- Export Panel
- Settings

### Information Hierarchy
```
Project → Date → Meeting → Transcription → AI Summary
```

### Screen List
1. Dashboard
2. Create Project
3. Project Page
4. Meeting List
5. Recording Setup
6. Recording Screen
7. Floating Recording Widget
8. Meeting Detail Page
9. Transcription View
10. AI Summary Editor
11. Speaker Rename Panel
12. Export Panel
13. Microphone Test Screen
14. Settings Page

---

## Project System

### Project Types
| Type | Access |
|------|--------|
| Private | Only the creator can access |
| Shared | Creator can invite collaborators |

### Roles
- **Owner** — individual project creator with full control

---

## UX Principles (Non-Negotiable)
1. **Proper visual hierarchy** — clear content priority at every level
2. **Low cognitive load** — minimal decisions, obvious flows
3. **Healthcare-grade clarity** — precision in labels, states, and feedback
4. **Product thinking** — every screen serves a user goal
5. **Progressive disclosure** — show only what's needed at each step
6. **Accessibility awareness** — inclusive design throughout
7. **Clear action hierarchy** — primary, secondary, and destructive actions must be visually distinct

---

## Design System

### Typography
- **Font Family:** Inter

### Colors
- **Primary Brand:** `#7133AE`

### Design Standards
- Clear typography hierarchy
- Consistent spacing
- Accessible color contrast
- Consistent icon usage (Lucide Icons)

---

## Future Features (Post-MVP)
- AI semantic search
- Meeting highlights
- Calendar integration
- Task management integration
- Advanced meeting analytics

## interactions
- Hover effects on cards and sidebar,
