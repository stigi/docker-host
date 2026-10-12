# 2026-10-12: node:lts-alpine3.18 -> node:24-alpine. Alpine 3.18 reached end
# of life in May 2025 and the floating `lts` tag had silently pinned Node 20.
# sqlite3 ships N-API prebuilds, so a Node major bump needs no native rebuild.
FROM node:24-alpine
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY . .
