# Frontend

Frontend app for the interrogation game.
## Tech

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS

## What exists right now

- Full game flow UI:
  - Home
  - Loading
  - Investigation (map + interrogation room)
  - Accusation
  - Result
- Language toggle: Spanish and English UI text.
- Suspect chat history per room.
- Requirement checklist per suspect.
- Optional voice playback for suspect responses (`/api/game/narrate`).
- Sus-O-Scan integration in interrogation responses.
- Contradiction report flow using parallel analysis calls (`/api/game/analyze`).

## Run

From `frontend/`:

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Backend integration

Current API base in code: `http://localhost:8000` (`src/lib/api.ts`).

Routes used by the frontend:

- `POST /api/game/start`
- `POST /api/game/interrogate`
- `POST /api/game/accuse`
- `POST /api/game/analyze`
- `POST /api/game/susoscan/scan`
- `POST /api/game/suggest`
- `POST /api/game/unlock-extra`
- `POST /api/game/narrate`

## Current caveat

- `unlockExtra` currently uses a relative URL (`/api/game/unlock-extra`) while other calls use `http://localhost:8000`.
- If you do not have a Next.js API proxy for that route, this call will fail until aligned with the same backend base URL.
