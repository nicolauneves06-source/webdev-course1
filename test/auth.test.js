import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createAuthRepository } from '../src/data/auth-repository.js';
import { openDatabase } from '../src/data/database.js';
import { createAuthService } from '../src/services/auth-service.js';

const demoEmail = 'student@example.test';
const testPassword = 'correct-test-password-2026';

async function withApplication(run) {
  const directory = mkdtempSync(join(tmpdir(), 'lab-booking-auth-'));
  const database = openDatabase(join(directory, 'app.db'));
  const authService = createAuthService(createAuthRepository(database));
  await authService.setPassword(demoEmail, testPassword);

  const server = createApp(database).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  try {
    await run(`http://127.0.0.1:${address.port}`, database, authService);
  } finally {
    server.close();
    await once(server, 'close');
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test('AC-1 user signs in and establishes a persistent cookie session', async () => {
  await withApplication(async (baseUrl, database, authService) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: testPassword }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { user: { id: 'demo-user', email: demoEmail } });
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\//);

    const token = cookie.match(/session=([^;]+)/)[1];
    const storedSession = database.prepare(
      'SELECT token_hash FROM sessions WHERE token_hash = ?'
    ).get(createHash('sha256').update(token).digest('hex'));
    assert.ok(storedSession);
    assert.deepEqual(authService.authenticateSession(token), { id: 'demo-user', email: demoEmail });

    const storedPasswordHash = database.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).get('demo-user').password_hash;
    assert.notEqual(storedPasswordHash, testPassword);
    assert.match(storedPasswordHash, /^scrypt\$/);
  });
});

test('AC-1 login screen and its assets are served', async () => {
  await withApplication(async (baseUrl) => {
    const page = await fetch(`${baseUrl}/login`);
    const pageHtml = await page.text();
    assert.equal(page.status, 200);
    assert.match(pageHtml, /<form id="login-form"/);
    assert.match(pageHtml, /action="\/api\/auth\/login"/);
    assert.match(pageHtml, /<label for="email">/);

    const script = await fetch(`${baseUrl}/login.js`);
    assert.equal(script.status, 200);
    const scriptText = await script.text();
    assert.match(scriptText, /fetch\(form\.action/);
    assert.match(scriptText, /window\.location\.assign\('\/bookings'\)/);

    const stylesheet = await fetch(`${baseUrl}/styles.css`);
    assert.equal(stylesheet.status, 200);
  });
});

test('AC-1 incorrect password does not establish a session', async () => {
  await withApplication(async (baseUrl, database) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: 'wrong-password-2026' }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: 'Email or password is incorrect.' });
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  });
});

test('AC-1 missing credentials are rejected', async () => {
  await withApplication(async (baseUrl, database) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: demoEmail }),
    });

    assert.equal(response.status, 400);
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  });
});

test('AC-1 password setup rejects unknown users and short passwords', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'lab-booking-auth-'));
  const database = openDatabase(join(directory, 'app.db'));
  const authService = createAuthService(createAuthRepository(database));

  try {
    assert.equal(await authService.setPassword(demoEmail, 'short'), false);
    assert.equal(await authService.setPassword('missing@example.test', testPassword), false);
    assert.equal(authService.authenticateSession('invalid'), null);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('AC-2 authenticated user sees only their own bookings on the API and list screen', async () => {
  await withApplication(async (baseUrl, database) => {
    database.prepare('INSERT INTO users (id, email) VALUES (?, ?)')
      .run('other-user', 'other@example.test');
    database.prepare(
      `INSERT INTO bookings (id, user_id, lab_name, starts_at, ends_at, purpose)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('other-booking', 'other-user', 'Private Lab', '2026-11-04T09:00:00Z', '2026-11-04T10:00:00Z', 'Other user booking');

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: testPassword }),
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];

    const response = await fetch(`${baseUrl}/api/bookings`, { headers: { cookie } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.bookings.length, 3);
    assert.deepEqual(result.bookings.map((booking) => booking.id), ['booking-1', 'booking-2', 'booking-3']);
    assert.equal(JSON.stringify(result).includes('other-booking'), false);

    const page = await fetch(`${baseUrl}/bookings`, { headers: { cookie } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /My bookings/);
    const script = await fetch(`${baseUrl}/bookings.js`);
    assert.equal(script.status, 200);
    assert.match(await script.text(), /api\/bookings/);
  });
});

test('AC-2 empty booking list has an explicit empty state', async () => {
  await withApplication(async (baseUrl, database) => {
    database.prepare('DELETE FROM bookings WHERE user_id = ?').run('demo-user');
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: testPassword }),
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const response = await fetch(`${baseUrl}/api/bookings`, { headers: { cookie } });
    assert.deepEqual(await response.json(), { bookings: [] });
  });
});

test('AC-3 unauthenticated API gets 401 and browser is redirected to login', async () => {
  await withApplication(async (baseUrl) => {
    const apiResponse = await fetch(`${baseUrl}/api/bookings`);
    assert.equal(apiResponse.status, 401);
    assert.deepEqual(await apiResponse.json(), { message: 'Sign in to view your bookings.' });

    const pageResponse = await fetch(`${baseUrl}/bookings`, { redirect: 'manual' });
    assert.equal(pageResponse.status, 302);
    assert.equal(pageResponse.headers.get('location'), '/login');
  });
});