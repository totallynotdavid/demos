# Build with the repository root as the context:
#   docker build -f apps/dokploy-status/Dockerfile .
# Host networking is required to expose the host's interfaces. Bridge networking
# exposes only the container's network namespace.
FROM oven/bun:1.4-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/dokploy-status/package.json apps/dokploy-status/
RUN bun install --frozen-lockfile --production --filter dokploy-status

WORKDIR /app/apps/dokploy-status
COPY apps/dokploy-status/src ./src
COPY apps/dokploy-status/public ./public

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

USER bun

CMD ["bun", "run", "src/index.ts"]
