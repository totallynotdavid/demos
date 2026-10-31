FROM oven/bun:1.4.4-slim AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/caserita/package.json apps/caserita/package.json
COPY apps/caserita/server/package.json apps/caserita/server/package.json
COPY apps/caserita/web/package.json apps/caserita/web/package.json
RUN bun install --frozen-lockfile --production

FROM node:26-slim

ENV NODE_ENV=production
ENV DB_PATH=/app/data/caserita.sqlite
ENV PORT=8787

WORKDIR /app

RUN groupadd --system --gid 10001 caserita \
  && useradd --system --uid 10001 --gid caserita \
    --home-dir /app --shell /usr/sbin/nologin caserita \
  && mkdir -p /app/data \
  && chown -R caserita:caserita /app

COPY --from=dependencies --chown=caserita:caserita /app/node_modules ./node_modules
COPY --chown=caserita:caserita apps/caserita/package.json ./apps/caserita/package.json
COPY --chown=caserita:caserita apps/caserita/server/package.json ./apps/caserita/server/package.json
COPY --chown=caserita:caserita apps/caserita/server/src ./apps/caserita/server/src

VOLUME ["/app/data"]
USER caserita

CMD ["node", "apps/caserita/server/src/server.ts"]
