# 2026-10-12: node:lts-alpine3.18 -> node:24-alpine. Alpine 3.18 reached end
# of life in May 2025 and the floating `lts` tag had silently pinned Node 20.
# sqlite3 ships N-API prebuilds, so a Node major bump needs no native rebuild.
# 2026-10-22: pinned to node:24.22.1-alpine (rebuilt 2026-10-21) for the eMudhra CA
# compromise: Node 24.22.1 ships a fixed bundled CA store and the image has Alpine
# ca-certificates-bundle 20261020-r0. The apk upgrade keeps the system store current on
# later rebuilds. Bump the tag/digest normally on future updates.
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
RUN apk upgrade --no-cache ca-certificates ca-certificates-bundle
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY . .
