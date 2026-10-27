export function createAuthRepository(database) {
  return {
    findUserByEmail(email) {
      return database.prepare(
        'SELECT id, email, password_hash FROM users WHERE email = ?'
      ).get(email);
    },

    updatePasswordHash(userId, passwordHash) {
      return database.prepare(
        'UPDATE users SET password_hash = ? WHERE id = ?'
      ).run(passwordHash, userId).changes;
    },

    createSession({ tokenHash, userId, createdAt, expiresAt }) {
      database.prepare(
        'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
      ).run(tokenHash, userId, createdAt, expiresAt);
    },

    findUserBySession(tokenHash, now) {
      return database.prepare(
        `SELECT users.id, users.email
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
      ).get(tokenHash, now);
    },
  };
}