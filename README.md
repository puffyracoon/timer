# GW2 Guild Wars 2 Meta Timer (React Rewrite)

Modern React + Vite + Tailwind implementation of the original static timer with extended features (GW2 API integration, reminders, chain scheduling, desktop notifications, procedural backgrounds).

## Structure
- backend/ (Express server serving production build)
- frontend/ (Vite React app)
- original assets (index.html, script.js, Style.css, events.json) remain untouched for reference

## Feature Highlights
* Real-time event occurrence list (rolling window) with countdowns & urgency styling
* Category filtering, search, favorites, alerts-only view
* Reminder cycle per occurrence (2m / 5m / 10m) with audio + optional desktop notifications
* Weekly auto-alert (auto adds 5m reminder to earliest unmet weekly WV objective event)
* Auto-mark completion (GW2 achievements + Wizard's Vault dailies / weeklies / specials heuristic mapping)
* Chain scheduling: when a chain step is marked done, schedule notification for the next step based on configured delay
* Done tracking resets at next UTC midnight
* Procedural background generation with user mode preference
* Desktop notification toggle (persists) + toast system
* Local persistence (favorites, reminders, categories, done, API key, toggles)
* Minimal unit test coverage (Vitest) with extensible setup

## Dev Setup
1. Install root & workspace tools (Node 18+ recommended)
2. Install dependencies:
```
cd frontend && npm install
cd ../backend && npm install
```
3. Run frontend dev server (Vite):
```
cd frontend
npm run dev
```
4. Separately run backend (dev proxy / prod serve):
```
cd backend
npm run dev
```

## Build & Serve (Production)
```
cd frontend
npm run build
cd ../backend
npm start
```
 - assets/, data/, events.json, meta-spec.json (static data and resources)
Then open http://localhost:3000

## Configuration & Usage
1. (Optional) Enter a GW2 API key (needs account, progression, unlocks, wizardsvault permissions) then Sync
2. Toggle AutoMark to auto-complete events tied to your achievements or WV objectives
3. Toggle Weekly5m to automatically assign a 5m reminder to your earliest incomplete weekly mapped event
4. Use Chains toggle to enable chain scheduling notifications
5. Desktop toggle requests notification permission (if granted) and sends system notifications alongside toasts
6. Click the bell on an event card to cycle reminder: No -> 2m -> 5m -> 10m -> No
7. Click the star to favorite; filter with Favorites button
## Build & Deploy (Production)
```
cd frontend
npm run build
```
The static site will be generated in `frontend/dist/` and can be deployed to GitHub Pages or any static host.

## Testing
From `frontend/` run:
```
npm test
```
Add tests under `__tests__/` or alongside components using `*.test.jsx`.

## Roadmap / Future Enhancements
* Expanded WV special/meta mapping & dynamic variant dictionary
* Accessibility (ARIA roles/labels pass) & keyboard navigation refinements
* Performance: virtualization for large event sets
Tailwind directives in `frontend/src/index.css` require the dev or build process.

All local state persists via `localStorage`; clear site data to reset.

## Notes
Tailwind directives in `frontend/src/index.css` require the dev or build process.

All local state persists via `localStorage`; clear site data to reset.
