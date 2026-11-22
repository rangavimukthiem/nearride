const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');

const HOST = '0.0.0.0';
const PORT = env.port || 3000;

const server = app.listen(PORT, HOST, () => {
  console.log(`${env.appName} API listening on ${HOST}:${PORT} [${env.nodeEnv}]`);
});

async function stop(signal) {
  console.log(`${signal}: shutting down gracefully`);
  server.close(async () => {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
