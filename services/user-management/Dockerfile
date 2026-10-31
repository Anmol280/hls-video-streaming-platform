FROM node:24-alpine

WORKDIR /app

COPY services/user-management/package*.json ./

RUN npm ci --omit=dev

COPY shared/ ./shared/
COPY services/user-management/ ./services/user-management/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/services/user-management
EXPOSE 3001

CMD ["npm", "start"]
