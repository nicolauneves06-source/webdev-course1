import { createApp } from './app.js';
import { openDatabase } from './data/database.js';

const port = Number(process.env.PORT ?? 3000);
const database = openDatabase();
const server = createApp(database).listen(port, '0.0.0.0', () => {
  console.log(`Lab Booking System listening on port ${port}`);
});

function closeServer() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);