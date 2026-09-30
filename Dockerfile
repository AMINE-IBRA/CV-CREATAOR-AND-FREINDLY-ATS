FROM node:24-bookworm-slim

# Prisma's Linux engine requires OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates
WORKDIR /app

# Both packages need their development dependencies to compile.
COPY server/package.json server/package-lock.json ./server/
COPY server/prisma ./server/prisma/
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix server --include=dev && npm ci --prefix client --include=dev

COPY package.json ./
COPY server ./server/
COPY client ./client/
ENV VITE_API_URL=/api
ENV DATABASE_URL=file:/data/cv-creator.db
RUN npm run db:generate && npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
RUN mkdir -p /data
EXPOSE 3001

# The persistent SQLite volume is available at runtime, not build time.
CMD ["sh", "-c", "cd /app/server && npm run prisma:deploy && exec node dist/index.js"]
