import 'dotenv/config';
import app from './src/app.js';

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', event: 'server_listening', port }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
