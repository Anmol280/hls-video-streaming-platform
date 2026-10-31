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

  camelizeRow(row) {
    if (!row) return row;
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value
    ]));
  }

  async createVideo(videoData) {
    const query = [
      'INSERT INTO videos (id, user_id, title, description, original_filename, s3_key, s3_url,',
      'file_size, duration, width, height, visibility, tags, status, created_at, updated_at)',
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())',
      'RETURNING *'
    ].join(' ');
    const values = [
      videoData.id,
      videoData.userId,
      videoData.title,
      videoData.description || '',
      videoData.originalFilename,
      videoData.s3Key,
      videoData.s3Url,
      videoData.fileSize,
      videoData.duration,
      videoData.width,
      videoData.height,
      videoData.visibility || 'private',
      videoData.tags || [],
      videoData.status || 'uploaded'
    ];
    const result = await this.pool.query(query, values);
    return this.camelizeRow(result.rows[0]);
  }

  async getVideoById(videoId) {
    const result = await this.pool.query(
      'SELECT v.*, v.user_id AS "userId", v.s3_key AS "s3Key", ' +
      'v.s3_url AS "s3Url", v.original_filename AS "originalFilename", ' +
      'v.file_size AS "fileSize", v.thumbnail_url AS "thumbnailUrl" ' +
      'FROM videos v WHERE v.id = $1',
      [videoId]
    );
    return this.camelizeRow(result.rows[0]) || null;
  }

  async updateVideo(videoId, updateData) {
    const columns = {
      title: 'title',
      description: 'description',
      status: 'status',
      thumbnailUrl: 'thumbnail_url',
      visibility: 'visibility',
      tags: 'tags'
    };
    const entries = Object.entries(updateData).filter(([, value]) => value !== undefined);
    if (!entries.length) throw new Error('No fields to update');
    if (entries.some(([key]) => !columns[key])) throw new Error('Unsupported video field');

    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) =>
      columns[key] + ' = $' + (index + 1)
    );
    values.push(videoId);
    const result = await this.pool.query(
      'UPDATE videos SET ' + assignments.join(', ') +
      ', updated_at = NOW() WHERE id = $' + values.length + ' RETURNING *',
      values
    );
    return this.camelizeRow(result.rows[0]) || null;
  }

  async deleteVideo(videoId) {
    const result = await this.pool.query(
      'DELETE FROM videos WHERE id = $1 RETURNING *',
      [videoId]
    );
    return this.camelizeRow(result.rows[0]) || null;
  }

  async findActiveUserById(userId) {
    const result = await this.pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND is_active = TRUE',
      [userId]
    );
    return this.camelizeRow(result.rows[0]) || null;
  }

  async createTranscodingJob(videoId, jobData) {
    const query = [
      'INSERT INTO transcoding_jobs (id, video_id, job_type, status, job_data, created_at, updated_at)',
      "VALUES ($1, $1, 'transcode', 'queued', $2, NOW(), NOW())",
      'ON CONFLICT (id) DO UPDATE SET',
      "status = 'queued', worker_id = NULL, error_message = NULL,",
      'progress_percentage = 0, started_at = NULL, completed_at = NULL,',
      'retry_count = 0, job_data = EXCLUDED.job_data, updated_at = NOW()',
      'RETURNING *'
    ].join(' ');
    const result = await this.pool.query(query, [videoId, jobData]);
    return this.camelizeRow(result.rows[0]);
  }

  async updateTranscodingJob(videoId, { status, progressPercentage, errorMessage = null }) {
    const result = await this.pool.query(
      'UPDATE transcoding_jobs SET status = $1, ' +
      'progress_percentage = COALESCE($2, progress_percentage), error_message = $3, ' +
      "started_at = CASE WHEN $1 = 'processing' THEN COALESCE(started_at, NOW()) ELSE started_at END, " +
      "completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END, " +
      'updated_at = NOW() WHERE id = $4 RETURNING *',
      [status, progressPercentage, errorMessage, videoId]
    );
    return this.camelizeRow(result.rows[0]) || null;
  }

  async getTranscodingJob(videoId) {
    const result = await this.pool.query(
      'SELECT * FROM transcoding_jobs WHERE id = $1',
      [videoId]
    );
    return this.camelizeRow(result.rows[0]) || null;
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
