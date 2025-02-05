ARG CADDY_VERSION=2.8
FROM caddy:${CADDY_VERSION}-builder AS builder

RUN xcaddy build \
    --with github.com/lucaslorentz/caddy-docker-proxy/v2 \
    --with github.com/lindenlab/caddy-s3-proxy

FROM caddy:${CADDY_VERSION}-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Installing curl for health check
RUN apk --no-cache add curl

COPY ./with-expanded-env.sh /with-expanded-env.sh
RUN chmod +x /with-expanded-env.sh
CMD ["/with-expanded-env.sh", "caddy", "docker-proxy"]
