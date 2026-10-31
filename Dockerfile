# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN pnpm build

FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/guilhermebkel/better-caprover-mcp"
LABEL org.opencontainers.image.description="Unofficial MCP server for CapRover"
LABEL org.opencontainers.image.licenses="MIT"
COPY --from=build --chmod=755 /app/dist/main.js /usr/local/bin/better-caprover-mcp
USER node
ENTRYPOINT ["better-caprover-mcp"]
