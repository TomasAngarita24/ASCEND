# Multi-stage: build the TypeScript API, then run it from a slim image.
# Node 24 matches the local toolchain. glibc (bookworm) is used so the native
# argon2 addon compiled in the build stage runs in the slim runtime image.
# The Prisma CLI ships in the final image so `prisma migrate deploy` can run on startup.

FROM node:24-bookworm AS build
WORKDIR /app

# argon2 compiles from source during `npm ci` (no prebuilt linux binaries).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma's CLI needs OpenSSL to detect the engine library version.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

EXPOSE 3000
# Apply migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]