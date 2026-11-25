# Deadlock Tracker

## Folders
- (root)  static site: open `index.html` with VS Code Live Server. Deploy to Vercel.
- `server/`  Express + Mongoose API. Deploy to Render/Railway.

## Run the server
    cd server
    npm install
    copy .env.example .env      (then fill in MONGODB_URI and JWT_SECRET)
    npm run dev                 -> http://localhost:3000/api/health

## Routes
| Verb | Route | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | no | { username, email, password, accountId? } -> { token, user } |
| POST | /api/auth/login | no | { email, password } -> { token, user } (added: needed for the routes below) |
| GET | /api/auth/me | yes | |
| GET | /api/players/:accountId | no | snapshot, refreshed from the Deadlock API when older than 1h (?refresh=1 forces) |
| POST/GET | /api/favorites | yes | |
| PUT/DELETE | /api/favorites/:id | yes | PUT changes nickname/notes only |
| POST/GET | /api/builds | yes | GET ?public=1 lists public builds |
| GET/PUT/DELETE | /api/builds/:id | yes | |
| GET | /api/compare?me=&them= | no | |
| GET | /api/players/:id/steam, /match-history, /rank, /hero-stats | no | raw proxy + Mongo cache (used by player.js) |
| GET | /api/ranks/distribution | no | raw proxy + Mongo cache (used by ranks.js) |

Send the token as `Authorization: Bearer <token>`.

## Before deploying
- Set `API_BASE` (top of `data.js`) to your deployed server URL.
- Set `CORS_ORIGIN` on the server to your Vercel URL.
- Add `fonts/ForevsDemo.woff2` (the hero-name font is not in the zip).
