# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## 2026-10-27 · Persistent SQLite seed
- Goal: Create a persistent SQLite database for Slice 1 with schema and sample bookings.
- Delegated: None; the execution subagent was unavailable.
- Checkpoints: SQLite 3.40.1 loaded `src/data/schema.sql` into `data/app.db`; verification found 1 user, 3 bookings, 0 sessions, and no foreign-key violations.
- Went wrong: The initial `.read` invocation was malformed; loading the schema through stdin succeeded.
- Changed by hand: None.

## 2026-10-27 · Sign-in
- Goal: Implement Slice 1 email/password sign-in without the bookings list.
- Delegated: None.
- Checkpoints: Express installation was approved; `npm test` passed 5/5; `GET /login` returned 200; workspace diagnostics found no errors.
- Went wrong: SQLite rows needed normalization in the auth service; the login asset test was aligned with the form action.
- Changed by hand: None.

## 2026-10-27 · My Bookings
- Goal: Implement Slice 1 personal bookings API and list screen with persistent SQLite storage.
- Delegated: None.
- Checkpoints: `npm test` passed 8/8; diagnostics found no errors; live API returned 401 unauthenticated, browser route redirected to `/login`, and `data/app.db` retained 1 user and 3 bookings.
- Went wrong: The login asset test initially read its response body twice; it now reads it once and checks both assets and redirect behavior.
- Changed by hand: None.

## 2026-10-27 · Exercise 2 spec completion
- Goal: Fill the project specification, conventions, and package MCP script to satisfy the Exercise 2 structure check.
- Delegated: None.
- Checkpoints: `node checks/ex2.mjs` passed 32/32; `npm test` passed 8/8.
- Went wrong: The first package edit placed the MCP script outside the JSON object; corrected it inside `scripts` and reran both checks.
- Changed by hand: None.
