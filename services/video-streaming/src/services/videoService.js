const { Pool } = require('pg');

class VideoService {
  constructor() {
    const options = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'hls_platform',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || undefined
        };
    this.pool = new Pool(options);
  }

  async getVideoForStreaming(videoId) {
    const result = await this.pool.query(
      'SELECT id, user_id AS "userId", visibility, status ' +
      'FROM videos WHERE id = $1',
      [videoId]
    );
    return result.rows[0] || null;
  }

  async checkConnection() {
    await this.pool.query('SELECT 1');
    return true;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new VideoService();
