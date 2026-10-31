require('dotenv').config();

const { spawnSync } = require('child_process');
const redis = require('redis');

function requireBinary(binary) {
  const result = spawnSync(binary, ['-version'], { stdio: 'ignore', timeout: 5000 });
  if (result.error || result.status !== 0) {
    throw new Error(binary + ' is not available');
  }
}

async function healthCheck() {
  let client;
  try {
    requireBinary('ffmpeg');
    requireBinary('ffprobe');
    const url = process.env.REDIS_URL ||
      'redis://' + (process.env.REDIS_HOST || 'localhost') + ':' +
      (Number(process.env.REDIS_PORT) || 6379);
    client = redis.createClient({ url });
    await client.connect();
    await client.ping();
    await client.quit();
    process.exitCode = 0;
  } catch (error) {
    if (client && client.isOpen) await client.quit().catch(() => {});
    console.error('Health check failed:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) healthCheck();

module.exports = healthCheck;
