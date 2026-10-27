import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const dummyPasswordHash = `scrypt$${'00'.repeat(16)}$${'00'.repeat(64)}`;

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, saltHex, keyHex] = String(encodedHash ?? '').split('$');
  if (algorithm !== 'scrypt' || !/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(keyHex)) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await scrypt(password, salt, expectedKey.length);
  return timingSafeEqual(actualKey, expectedKey);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthService(repository, now = () => new Date()) {
  return {
    async setPassword(email, password) {
      if (typeof email !== 'string' || typeof password !== 'string' || password.length < 12) {
        return false;
      }

      const user = repository.findUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return false;
      }

      const passwordHash = await hashPassword(password);
      return repository.updatePasswordHash(user.id, passwordHash) === 1;
    },

    async signIn(email, password) {
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim()) {
        return null;
      }

      const user = repository.findUserByEmail(email.trim().toLowerCase());
      const passwordMatches = await verifyPassword(password, user?.password_hash ?? dummyPasswordHash);
      if (!user || !passwordMatches) {
        return null;
      }

      const token = randomBytes(32).toString('base64url');
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs);
      repository.createSession({
        tokenHash: hashSessionToken(token),
        userId: user.id,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      return {
        token,
        expiresAt,
        user: { id: user.id, email: user.email },
      };
    },

    authenticateSession(token) {
      if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) {
        return null;
      }

      const user = repository.findUserBySession(hashSessionToken(token), now().toISOString());
      return user ? { id: user.id, email: user.email } : null;
    },
  };
}