# ResolveIQ

**Report smarter. Resolve faster.**

ResolveIQ is a full-stack issue reporting and resolution platform built with the MERN stack. It combines role-based access, a complete ticket lifecycle, and built-in abuse prevention (rate limiting, duplicate detection, suspicious-activity flags, an admin review queue and an audit log).

## Why it exists

Traditional issue trackers suffer from duplicate tickets, spam, unclear status and weak access control. ResolveIQ addresses these with:

- role-based access enforced on the server
- a clear ticket lifecycle with a full history
- automatic flagging of likely duplicates and rapid-fire submissions, reviewed by a human instead of auto-banning anyone
- an append-only audit trail of key actions

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Fetch API, plain CSS |
| Backend | Node.js, Express, REST API |
| Database | MongoDB Atlas, Mongoose |
| Security | bcryptjs, JSON Web Tokens, Helmet, CORS, express-rate-limit, server-side validation, audit logging |

## Roles

| Role | Can do | Cannot do |
| --- | --- | --- |
| **User** | Register, log in, create tickets, search/filter/page their own tickets, read ticket details and history | See other users' tickets, assign, change roles, see the review queue |
| **Support agent** | See tickets assigned to them, read details and history, move tickets to In Progress or Resolved with a note | Touch tickets that are not assigned to them, assign or close tickets, use admin features |
| **Administrator** | See all tickets, assign tickets to agents, change statuses, close tickets, manage user roles, review flagged tickets, read the audit log | Change their own role |

Public registration always creates a normal `user`. Agents and admins are created by an administrator (or the seed script). All of this is enforced by the backend. The React route guards only improve the experience.

## Ticket lifecycle

`Open` → `Assigned` → `In Progress` → `Resolved` → `Closed`

- An admin assigns a ticket to a support agent, which sets it to `Assigned`.
- The agent moves it to `In Progress`, then to `Resolved` (a resolution note of at least 5 characters is required). A resolved ticket can go back to `In Progress`.
- Only an admin can close a ticket. Closed tickets cannot be changed.
- Every change is added to the ticket's history, and tickets get sequential numbers such as `RIQ-0001`.

## Abuse prevention

1. **Rate limiting (HTTP 429).** Failed logins (10 per 15 minutes per address), registrations (10 per hour per address) and ticket creation (10 per 10 minutes per user). All limits are configurable.
2. **Input limits and validation.** JSON bodies are capped at 10 KB, and every field is validated on the server.
3. **Duplicate detection.** New tickets are compared with the same user's tickets from the last 7 days using Jaccard similarity on the distinct words of title and description (common filler words ignored). A score of 0.7 or higher flags the ticket. The threshold and window are configurable.
4. **Rapid-submission rule.** Four or more tickets from one user within two minutes flags the later tickets. Also configurable.
5. **Flags never block anyone.** Flagged tickets are still created. Flags are hidden from the person who submitted the ticket.
6. **Admin review queue.** Admins see each flag with its reason, the similarity score and the ticket it resembles, and can dismiss false positives with a note.
7. **Audit log.** Ticket creation, assignment, status changes, role changes and flag dismissals are recorded with who did them. The log stores IDs and short descriptions, never passwords or tokens. The model refuses updates and deletes.

## Getting started

### Prerequisites

- Node.js 22 or newer (developed on Node.js 26) and npm
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Set up MongoDB Atlas

1. Create a free cluster.
2. Create a database user. Use a password made of letters and numbers only, so it does not need URL-encoding.
3. Add your current IP address to the cluster's IP Access List. If the app suddenly cannot connect, your IP has probably changed.
4. Copy the Node.js connection string and add the database name, for example `.../resolveiq?retryWrites=true&w=majority`.

### 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your own values. Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then create the first admin account and start the server:

```bash
npm run seed:admin
npm run dev
```

The API runs on port 5001. (Port 5000 is avoided because macOS uses it for AirPlay Receiver.) Check `http://localhost:5001/api/health`.

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. If your API runs somewhere else, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

### 4. Try it

1. Log in with the admin details from your `.env`.
2. Register a second account in a private window. It will be a normal user.
3. In the admin **Users** tab, promote an account to **Support agent**.
4. Create tickets as the user, assign them as the admin, and resolve them as the agent.

## Configuration (backend `.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5001) |
| `MONGODB_URI` | Atlas connection string, including the database name |
| `CLIENT_ORIGIN` | The one frontend origin allowed by CORS |
| `JWT_SECRET` | Long random secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `1d` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by `npm run seed:admin` (password 12 or more characters) |
| `LOGIN_RATE_MAX`, `LOGIN_RATE_WINDOW_MIN` | Failed-login limit and window |
| `REGISTER_RATE_MAX`, `REGISTER_RATE_WINDOW_MIN` | Registration limit and window |
| `TICKET_RATE_MAX`, `TICKET_RATE_WINDOW_MIN` | Ticket-creation limit and window |
| `DUPLICATE_THRESHOLD`, `DUPLICATE_WINDOW_DAYS` | Jaccard threshold and look-back window |
| `RAPID_TICKET_COUNT`, `RAPID_WINDOW_MIN` | Rapid-submission rule |

Never commit `.env`. It is listed in `.gitignore`.

## API overview

| Method and path | Who |
| --- | --- |
| `GET /api/health` | Anyone |
| `POST /api/auth/register`, `POST /api/auth/login` | Anyone (rate limited) |
| `GET /api/auth/me` | Any logged-in user |
| `POST /api/tickets` | Users only (rate limited) |
| `GET /api/tickets`, `GET /api/tickets/:id` | Any role, scoped to what that role may see |
| `PATCH /api/tickets/:id/assign` | Admin |
| `PATCH /api/tickets/:id/status` | Admin or assigned agent |
| `GET /api/users`, `PATCH /api/users/:id/role` | Admin |
| `GET /api/admin/flags`, `PATCH /api/admin/flags/:ticketId/:flagId/dismiss` | Admin |
| `GET /api/admin/audit` | Admin |

`GET /api/tickets` supports `q` (search), `status`, `priority`, `category`, `page` and `limit`.

## Security design

- **Passwords** are hashed with bcryptjs (a pure-JavaScript bcrypt implementation, cost 12). Plain passwords are never stored or logged.
- **Authentication** uses signed JWTs. The user's role is read from the database on every request, so a role change takes effect immediately.
- **Generic login errors** ("Invalid email or password") do not reveal whether an email exists, and a dummy hash comparison keeps response times similar.
- **Authorization** is enforced on the server in every route. Tickets a user may not see return `404`, the same as tickets that do not exist.
- **Mass-assignment protection.** Registration ignores any `role`, and ticket creation ignores `status` and `assignedTo`.
- **Hardening.** Helmet headers, CORS limited to one explicit origin, body size limits, and regular-expression escaping for search input.
- **Secrets** live only in `.env`. The frontend never receives them.

### Where the login token is stored, and the trade-off

The token is kept in the browser's `localStorage` so a page refresh does not log you out.

- **XSS risk.** Any script running on the page can read `localStorage`. React escapes rendered text by default and this app never uses `dangerouslySetInnerHTML`, but an XSS bug or a compromised dependency could still steal the token.
- **CSRF.** Because the token is sent in an `Authorization` header by the app's own code (not in a cookie), the browser never attaches it automatically, so classic CSRF attacks do not apply.
- **Alternative.** An `httpOnly`, `Secure`, `SameSite` cookie cannot be read by scripts, which removes the XSS-theft risk, but it brings back CSRF and needs CSRF protection. For a production system with stronger requirements, that cookie approach (plus short-lived access tokens and refresh tokens) is the better design.

## Known limitations

- Logging out removes the token in the browser only. The token stays valid until it expires, because there is no server-side revocation list.
- Rate-limit counters are kept in memory, so they reset when the server restarts and are not shared between multiple server instances. Behind a reverse proxy you would also need to configure Express's `trust proxy` setting. A shared store such as Redis would fix both.
- The audit log is append-only through the application. Someone with direct database access could still change it, so a production setup should restrict database permissions (the Atlas quickstart user is an admin, which should be tightened to `readWrite` on this database).
- Duplicate detection compares only a user's own recent tickets, and it is word-overlap based, so it does not understand synonyms or spelling differences. Very short tickets can score as false positives, which is why an admin reviews every flag.
- Authentication anomalies are handled by rate limiting only. They do not create review-queue flags.
- There is no email verification, password reset or multi-factor authentication.
- There is no automated test suite yet. The API behaviour was verified with scripted checks during development.
- The admin area has no statistics dashboard yet.
- The frontend is served by Vite's dev server. A production deployment should serve it with a strict Content-Security-Policy.

## Project structure

```text
resolveiq/
├── backend/
│   └── src/
│       ├── middleware/   auth, role checks, rate limiters
│       ├── models/       User, Ticket, Counter, AuditLog
│       ├── routes/       auth, tickets, ticket actions, users, admin
│       ├── scripts/      admin seed script
│       ├── utils/        duplicate detection, rapid-submission rule, audit helper
│       ├── db.js
│       └── server.js
└── frontend/
    └── src/
        ├── components/   layout, route guards, ticket window, review queue, audit log
        ├── context/      authentication state
        ├── pages/        login, register, user / agent / admin dashboards
        └── api.js
```