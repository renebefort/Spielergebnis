# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (Vite, hot reload)
- **Build:** `npm run build` (output in `dist/`)
- **Preview production build:** `npm run preview`

No test framework or linter is configured.

## Architecture

Single-page React 18 app built with Vite. The entire app lives in three source files:

- `src/App.jsx` — all components, state, and logic in one file (single `App` component)
- `src/App.css` — all styles, dark theme via CSS custom properties (`:root` vars prefixed `--clr-`)
- `src/main.jsx` — React entry point

### App purpose

German-language sports score tracker (football/handball). Users add players by jersey number (Trikonummer), track goals with +/- buttons, and copy results as Markdown.

### Key data model

- Player: `{ num: number, name: string, goals: number }`
- Two independent player lists: `homePlayers` and `guestPlayers`
- Players are sorted by `num` for display, stored as unsorted arrays
- Handball mode: score = total goals × min(scorers count, maxScorers)

### State persistence

All state is persisted to `localStorage` with the `sg_` prefix (`sg_homePlayers`, `sg_guestPlayers`, `sg_maxScorers`).

## Deployment

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). Pushes to `main` trigger build and deploy. Vite `base` is set to `/Spielergebnis/`.

## Language

UI text and commit messages are in German.
