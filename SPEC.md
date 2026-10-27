# Lab Booking System
## Project option
Lab booking for students who need to reserve and review shared university lab time.
## Goals
- Let a student sign in and view only their own lab bookings.
- Let an authenticated student reserve an available lab slot in a later slice.
- Keep booking data in persistent SQLite storage and apply the same ownership rules to HTTP and MCP requests.
## Non-goals
- Google OAuth, model suggestions, MCP project tools, and booking creation or cancellation are not part of Slice 1.
- Calendar and day-view interfaces are out of scope; bookings use a chronological list.
- The model does not make reservations, change booking data, or provide authoritative lab-safety instructions.
- No booking or account data is sent to a model provider without an explicit user action.
## Constraints
- The backend uses Node.js 22 and Express; the frontend uses HTML, CSS, and browser JavaScript.
- SQLite is the source of truth. The application database is the persistent file `data/app.db`, selected with `DATABASE_PATH`.
- Local passwords are stored as scrypt hashes. Session tokens are random, stored as hashes in SQLite, and sent in HttpOnly, SameSite cookies.
- Google OAuth and Gemini credentials are read from environment variables; tests do not call third-party services.
- Route handlers translate HTTP input and results. Services own business rules. Repositories are the only layer that issues SQL.
## The model feature
- Model: Google Gemini 2.5 Flash, called by the planned `src/services/model-client.js` using `GEMINI_API_KEY`.
- Input: Only after the user explicitly requests a suggestion, send their lab-task description and the currently available lab slots returned by the service; do not send account identity, email, password, or session data.
- When it fails: Apply a five-second timeout. For a timeout, rate limit, provider error, invalid response, or unavailable key, show a deterministic message asking the user to choose from the verified slots. Never save an unvalidated model response.
## Auth
- Local: `POST /api/auth/login` accepts email and password. Passwords are scrypt-hashed in `users`; successful sign-in creates a hashed, expiring SQLite session and an HttpOnly cookie.
- Provider: Google OAuth 2.0 is planned for a later slice, using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; accept only a verified Google email.
- Linking: A user must already be signed in locally, re-enter their local password, and explicitly start linking. Link the verified Google subject to that user. Never merge accounts solely because email strings match; an unlinked Google sign-in with a matching email must ask the user to sign in locally and link first.
## MCP tools
| Tool | What it does | Who may call it |
| --- | --- | --- |
| `list_my_bookings` | Lists the authenticated user's bookings, optionally filtered to a date range, through the shared bookings service. | A user whose `MCP_TOKEN` resolves to a valid session. |
| `get_my_booking` | Returns one booking only when it belongs to the authenticated user; otherwise it returns a not-found result without exposing another account's data. | A user whose `MCP_TOKEN` resolves to a valid session. |
| `search_my_bookings` | Searches the authenticated user's bookings by lab name and date range through the shared bookings service. | A user whose `MCP_TOKEN` resolves to a valid session. |
## UI
Stack: server-backed Express app with semantic HTML, responsive CSS, and browser JavaScript. Implemented screens: `/login` and the authenticated chronological `/bookings` list. Later slices may add account linking, a booking form, and an explicitly requested model suggestion. The checklist and evidence requirements are in `docs/UI.md`.
## Architecture
- Sign-in: `POST /api/auth/login` → `src/routes/auth.js` → `src/services/auth-service.js` → `src/data/auth-repository.js` → `data/app.db`.
- Bookings: `GET /api/bookings` → `src/routes/bookings.js` → `src/services/bookings-service.js` → `src/data/booking-repository.js` → `data/app.db`. The browser list uses the same API and the page route checks the same session service.
- Future MCP tools must call those same service functions; they must not contain SQL or access the database directly.
## Acceptance criteria
### Slice 1: sign-in and my bookings
- [AC-1] A user with a valid email and password can sign in through `POST /api/auth/login`; the response establishes an expiring session cookie and stores only a session-token hash in SQLite.
- [AC-2] An authenticated user can retrieve only their own bookings from `GET /api/bookings` and see those bookings on `/bookings`.
- [AC-3] A request without a valid session receives `401` from `GET /api/bookings`, and browser navigation to `/bookings` redirects to `/login`.
### Later slices
- [AC-4] An authenticated user can create an available booking through `POST /api/bookings`; the booking is persisted with that user's ID and the response is `201`.
- [AC-5] A request to create a booking that conflicts with an existing booking for the same lab and time receives `409`, and no conflicting row is added.
- [AC-6] A user can cancel their own booking; attempting to cancel another user's booking returns `404` and leaves that booking unchanged.
- [AC-7] A signed-in local user can explicitly link a Google identity only after confirming their local password and completing Google verification for the same account.
- [AC-8] Signing in with a linked, verified Google identity resolves to the same user ID as local sign-in; an unlinked identity is not silently merged by email.
- [AC-9] After an explicit request, the model can suggest a slot from the current availability; the UI labels it as a suggestion and the service rejects any slot not present in current SQLite data.
- [AC-10] If the model times out, is rate-limited, is unavailable, or returns an invalid suggestion, the user sees the deterministic fallback and no booking or unvalidated model output is saved.
- [AC-11] The authenticated `list_my_bookings` MCP tool returns the same user's bookings as the shared service and never returns another user's bookings.
- [AC-12] The authenticated `get_my_booking` MCP tool returns an owned booking and does not reveal a booking owned by another user.
- [AC-13] The authenticated `search_my_bookings` MCP tool filters only the caller's bookings by the requested lab and date range.
## Traceability
| Criterion | Test |
| --- | --- |
| AC-1 | `AC-1 user signs in and establishes a persistent cookie session` in `test/auth.test.js` |
| AC-2 | `AC-2 authenticated user sees only their own bookings on the API and list screen` in `test/auth.test.js` |
| AC-3 | `AC-3 unauthenticated API gets 401 and browser is redirected to login` in `test/auth.test.js` |
| AC-4–AC-13 | Planned for later slices; add and pass a test for each criterion with its implementation. |
## Spec vs result
Slice 1 implements AC-1 through AC-3; the corresponding tests pass. The implementation uses persistent `data/app.db`, not an in-memory application database. No Slice 1 criterion was reinterpreted. AC-4 through AC-13 describe later work and are not implemented or claimed as passed yet.