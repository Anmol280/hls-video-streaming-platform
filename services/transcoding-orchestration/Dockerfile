FROM node:18-alpine

RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs &&     adduser -S nodejs -u 1001 &&     chown -R nodejs:nodejs /app

USER nodejs

EXPOSE $PORT

CMD ["npm", "start"]
