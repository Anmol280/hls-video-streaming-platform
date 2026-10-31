#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');
const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/i;
const MIGRATION_LOCK_ID = 4827311;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running database migrations.');
  }

  const migrationFiles = (await fs.readdir(MIGRATIONS_DIR))
    .filter((file) => MIGRATION_FILE_PATTERN.test(file))
    .sort((left, right) => left.localeCompare(right));

  if (migrationFiles.length === 0) {
    throw new Error('No migration files found in ' + MIGRATIONS_DIR);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let client;

  try {
    client = await pool.connect();
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query([
      'CREATE TABLE IF NOT EXISTS schema_migrations (',
      '  version TEXT PRIMARY KEY,',
      '  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      ')'
    ].join('\n'));

    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/i, '');
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (applied.rowCount > 0) {
        console.log('Skipping applied migration ' + version);
        continue;
      }

      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log('Applying migration ' + version);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
          [version]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error('Migration ' + version + ' failed: ' + error.message);
      }
    }

    console.log('Database migrations are up to date.');
  } finally {
    try {
      if (client) {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
        } finally {
          client.release();
        }
      }
    } finally {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = runMigrations;
