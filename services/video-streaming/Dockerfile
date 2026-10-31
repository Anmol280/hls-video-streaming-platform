FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/storage && chown -R app:app /app

USER app
EXPOSE 3005

CMD ["npm", "start"]
