# HLS Video Streaming MVP

This repository contains a microservice based HLS video platform. The MVP workflow is multipart upload, database record creation, Bull/Redis job dispatch, FFmpeg HLS transcoding, playlist and segment delivery, and a browser player at /watch/<videoId>.

The automated tests cover queue and playlist contracts and streaming HTTP responses. They do not run PostgreSQL, Redis, FFmpeg, and a real browser together, so end-to-end playback still needs a Docker based run.

## Services

| Service | Local URL | Responsibility |
| --- | --- | --- |
| Frontend | http://localhost:3000 | Login and HLS watch page |
| User management | http://localhost:3001 | JWT login and user records |
| Video upload | http://localhost:3002 | Authenticated multipart uploads |
| Video streaming | http://localhost:3005 | Master playlists, variants, and HLS segments |
| PostgreSQL | localhost:5432 | Video and transcoding job records |
| Redis | localhost:6379 | Bull queue |

The transcoding worker runs in the background and shares the hls_storage volume with the upload and streaming services.

## Local Docker run

Requirements: Docker Desktop with Linux containers, Node.js 24 or later, and an available Docker engine.

1. Copy .env.example to .env. Its secret is only for local development; set a unique secret before deploying.
2. Start the stack:

~~~sh
docker compose -f docker-compose.dev.yml up --build
~~~

3. Wait for PostgreSQL, Redis, upload, and streaming health checks to pass. A fresh PostgreSQL volume applies database/migrations/001_core_schema.sql during initialization. If reusing an existing volume, run npm run db:migrate from the repository root after installing root dependencies.
4. Log in through the frontend or user management API and use the returned access token for an upload.

Example upload using curl:

~~~sh
curl -X POST http://localhost:3002/api/upload/video \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "title=Sample video" \
  -F "visibility=public" \
  -F "video=@./sample.mp4"
~~~

The response includes the video UUID. The video is queued for processing. Poll GET /api/upload/progress/<videoId> with the same bearer token until the job is completed and the video status is ready.

Open http://localhost:3000/watch/<videoId> to play it. For private videos, sign in as the owner in the same browser. Public and unlisted videos can be played without a bearer token.

The generated master playlist is available at:

~~~text
GET http://localhost:3005/api/stream/hls/<videoId>/playlist.m3u8
~~~

Variant playlists and segment URLs are relative to that master playlist. The streaming service serves the stored playlist and segment bytes; it does not synthesize a replacement manifest.

## Focused checks

~~~sh
npm --prefix services/user-management test -- --runInBand
npm --prefix services/video-upload test -- --runInBand
npm --prefix services/video-streaming test -- --runInBand
npm --prefix workers/transcoding-worker test -- --runInBand
npm --prefix frontend run lint
npm --prefix frontend run build
~~~

Install each package's locked dependencies with `npm ci` in that package directory before running its checks.

docker compose -f docker-compose.dev.yml config --quiet checks the Compose file without starting containers.

## Configuration

- JWT_SECRET must be identical for user management, upload, and streaming. The Compose default is local-only.
- Development Compose uses a shared local Docker volume. For hosted deployments set STORAGE_DRIVER=s3, S3_BUCKET_NAME, AWS_REGION, and workload credentials. The worker needs permission to read originals, list and delete the video's old HLS prefix on retries, and write playlists and segments. The streaming service needs permission to read HLS objects.
- DATABASE_URL and REDIS_URL must point to the same PostgreSQL database and Redis instance for all relevant services.
- Uploads use temporary disk files, with a default 500 MiB per-video limit. Bulk uploads default to two files, and thumbnails default to 5 MiB.
- Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_STREAMING_URL as frontend Docker build arguments when public service URLs differ from localhost.

## Scope and provenance

Analytics, CDN signing, progressive downloads, direct-to-S3 presigned uploads, and automated thumbnail generation are outside this MVP path. The presigned upload endpoint is disabled until it can create and verify matching database and queue state.

Package manifests currently declare MIT, but this checkout contains no repository LICENSE or NOTICE files. Verify license provenance and include authoritative license text before redistribution. This README does not assign new authorship or ownership.
