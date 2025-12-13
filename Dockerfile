# syntax=docker/dockerfile:1.4
# ================================
# AURA Notifications Service
# OPTIMIZED: BuildKit cache mounts
# ================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install OpenSSL (required by Prisma 7.x)
RUN apk add --no-cache openssl

COPY package*.json ./

# Install dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Install OpenSSL (required by Prisma 7.x)
RUN apk add --no-cache openssl

COPY package*.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/src/config ./dist/config

EXPOSE 3004

# Copy entrypoint script
COPY scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
CMD [ "npm", "start" ]
