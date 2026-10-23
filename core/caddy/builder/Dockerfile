ARG CADDY_VERSION=2.11.7
FROM caddy:${CADDY_VERSION}-builder AS builder

RUN xcaddy build \
    --with github.com/lucaslorentz/caddy-docker-proxy/v2 \
    --with github.com/lindenlab/caddy-s3-proxy

# eMudhra CA (2026-10-22): runtime base pinned by digest to the 2026-10-21
# rebuild, which ships Alpine ca-certificates 20261020-r0 (no emSign ECC Root
# CA - G3 / AAA Certificate Services). Bump the digest together with
# CADDY_VERSION. Caddy (ACME, S3, HTTPS upstreams) reads the system store.
FROM caddy:${CADDY_VERSION}-alpine@sha256:24ec7b05bc532c7bb57f727030c5056e257ff7138b4b50460306819ff79362bd

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Installing curl for health check. The CA upgrade is a no-op on the pinned
# base; it keeps the store current if the base is ever left behind.
RUN apk --no-cache upgrade ca-certificates ca-certificates-bundle \
 && apk --no-cache add curl

COPY ./with-expanded-env.sh /with-expanded-env.sh
RUN chmod +x /with-expanded-env.sh
CMD ["/with-expanded-env.sh", "caddy", "docker-proxy"]
