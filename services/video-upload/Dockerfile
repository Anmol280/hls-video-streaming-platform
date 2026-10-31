FROM node:24-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/storage && chown -R app:app /app

USER app
EXPOSE 3002

CMD ["npm", "start"]
