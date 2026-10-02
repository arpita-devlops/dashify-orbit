import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';
import { initRealtime } from './realtime.js';
import { ensureDemoUser } from './seed.js';

await mongoose.connect(config.mongoUri);
console.log('[db] connected');
if (config.seedDemo) await ensureDemoUser();

const server = http.createServer(createApp());
initRealtime(server);
server.listen(config.port, () => {
  console.log(`[api] Dashify API + realtime listening on http://localhost:${config.port}`);
});

const shutdown = async () => {
  server.close();
  await mongoose.disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
