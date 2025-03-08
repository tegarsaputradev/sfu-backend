FROM node:20.17.0 AS base

# Build code
FROM base AS builder
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y python3-pip && rm -rf /var/lib/apt/lists/*
RUN cp .env.example .env && yarn && yarn build

FROM base AS dev
WORKDIR /app
COPY --from=builder /app/dist/ ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env .env
EXPOSE 8154
EXPOSE 60002-60202/udp

CMD ["node", "dist/index.js"]

FROM base AS prod
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env .env
EXPOSE 815
EXPOSE 60002-60202/udp
CMD ["node", "dist/index.js"]