FROM node:24-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY healthcheck.js ./

RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/storage && chown -R app:app /app

USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]
