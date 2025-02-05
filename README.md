# docker-host

This repository holds my personal self-hosted infra, based on a bunch of docker-compose files.

## Overview

### Reverse Proxy setup

All services are routed through [Caddy](https://caddyserver.com) as a reverse proxy. Services can configure themselves, by using docker labels. Caddy then recondigures itself when new services appear, using [caddy-docker-proxy](https://github.com/lucaslorentz/caddy-docker-proxy).

For a service to appear behind Caddy, it needs to join the external `caddy` network. This is created outside the context of any service, using `docker network create caddy`. Then a simple service could setup a reverse proxy by joining the `caddy` network and setting up labels for a subdomain like that:

```yaml
services:
  whoami:
    image: traefik/whoami
    networks:
      - caddy
    labels:
      caddy: whoami.ullrich.is
      caddy.reverse_proxy: "{{upstreams 80}}"

networks:
  caddy:
    external: true
```

### Authentication

### Observability

## Other Container config

## Volumes

## Secrets
