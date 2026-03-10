# ── Build stage ─────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ───────────────────────────
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY db ./db
COPY public ./public

ENV NODE_ENV=production
ENV BACKEND_PORT=4001
EXPOSE 4001

CMD ["node", "--import", "tsx", "server/index.ts"]
