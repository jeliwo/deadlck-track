# Deadlock Tracker

## Folders
- (root)  static site: open `index.html` with VS Code Live Server. Deploy to Vercel.
- `server/`  Express + Mongoose API. Deploy to Render/Railway.

## Set up MongoDB Atlas (once)
1. cloud.mongodb.com -> sign up -> create a **free (M0)** cluster.
2. Security -> Database Access -> Add user (username + password, "Read and write to any database"). Avoid special characters in the password, or URL-encode them.
3. Security -> Network Access -> Add IP -> "Allow access from anywhere" (0.0.0.0/0). Needed because Render/Railway IPs change.
4. Database -> Connect -> Drivers -> copy the connection string. Insert a database name before the "?":
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/deadlock?retryWrites=true&w=majority`

## Run the server
    cd server
    npm install
    copy .env.example .env      (Mac/Linux: cp)  -> paste the string into MONGODB_URI, set JWT_SECRET
    npm run dev

JWT_SECRET: generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Collections (users, favorites, builds, playersnapshots, caches) are created automatically on first write.

## Smoke test (second terminal)
    curl http://localhost:3000/api/health
    curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"test_user\",\"email\":\"t@example.com\",\"password\":\"password123\"}"
    curl "http://localhost:3000/api/players/search?q=gaben"
    curl http://localhost:3000/api/players/<accountId>
    curl "http://localhost:3000/api/compare?me=<id>&them=<id>"
    curl -X POST http://localhost:3000/api/favorites -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"accountId\":123456}"

## Routes
| Verb | Route | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | no | { username, email, password, accountId? } -> { token, user } |
| POST | /api/auth/login | no | { email, password } -> { token, user } (added: needed for the routes below) |
| GET | /api/auth/me | yes | |
| GET | /api/players/search?q=name | no | name lookup via Deadlock API steam-search |
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
