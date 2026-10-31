# HLS Platform Frontend

This Next.js App Router frontend uses React, TypeScript, Tailwind CSS, and Hls.js. The package requires Node.js 24 or later.

## Implemented screens

- Landing page and login/register forms.
- Dashboard shell with role-based navigation and stats requests.
- `/watch/<videoId>` page with a player that loads the streaming service's HLS master playlist. It uses Hls.js where needed and native HLS where the browser supports it.

The dashboard's creator statistics API is not part of the documented core service stack. The frontend does not currently provide a video upload form, video library, or processing-status dashboard; uploads can be made through the backend API described in the root README.

## Local development

Run these commands from this directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the user-management service and `NEXT_PUBLIC_STREAMING_URL` to the video-streaming service. The local Compose stack exposes them at `http://localhost:3001` and `http://localhost:3005`.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm run build
```

There is no automated frontend test script. Lint currently reports three warnings and no errors. The real upload-to-browser playback path has not been verified in this checkout; the player requires a generated playlist and segments from the backend services.

## Credits and license

This project uses Next.js, Tailwind CSS, Headless UI, Heroicons, and other packages listed in `package.json`; their respective licenses remain with their authors.

Package metadata declares MIT, but this checkout contains no repository `LICENSE` or `NOTICE` file. Verify license provenance and provide authoritative license text before redistribution. This README does not assign new authorship or ownership.
