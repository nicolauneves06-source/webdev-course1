import { openDatabase } from '../src/data/database.js';
import { createAuthRepository } from '../src/data/auth-repository.js';
import { createAuthService } from '../src/services/auth-service.js';

let password = '';
for await (const chunk of process.stdin) {
  password += chunk.toString();
}
password = password.replace(/[\r\n]+$/, '');

const database = openDatabase();
try {
  const updated = await createAuthService(createAuthRepository(database))
    .setPassword('student@example.test', password);

  if (!updated) {
    console.error('Password must be at least 12 characters and the demo user must exist.');
    process.exitCode = 1;
  } else {
    console.log('Demo account password updated.');
  }
} finally {
  database.close();
  password = '';
}