# docker-host

This repository holds my personal self-hosted infra, based on a bunch of docker-compose files.

I consider this host my playground, even though I host my online identity on it. My personal SLA has a 99% uptime. Well sort of...

## Hardware

All these services are run on a single machine hosted by Hetzner. Here's the spec:
- Intel(R) Core(TM) i7-2600 CPU @ 3.40GHz
- 32 GB Ram (4x RAM 8192 MB DDR3)
- 2x HDD SATA 3,0 TB

## Overview

This repo is structured by categories of services:
- `core` contains the basic services for reverse proxying, docker and authentication
- `oservability` contains everything around grafana, prometheus and the likes
- `services` contains all the other individual services

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

Authentication is handled by [Authelia](https://www.authelia.com), and Caddy snippets are provided, making it easy to require authentication on a subdomain basis, like so:

```yml
services:
  example:
    ...
    labels:
      caddy: example.ullrich.is
      caddy.reverse_proxy: "{{upstreams 5005}}"
      caddy.import: secure * # <-- The Caddy snippet in effect
```

### Observability

*wip*

## Other Container config

### Volumes

Volumes can either be declared using docker named volumes, or can be mounted. If opting into the later, it is recommended to keep those mountpoints inside the `volumes` directory, so they are git ignored, and don't make it into this repository.

### Secrets

Secrets are managed using [docker compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/). Each service defines a set of secrets that are stored in files inside it's `secrets` directory. They then are used directly as files (optimal scenario) or are expanded in the root processes environment using the `with-expanded-env.sh` script, inspired by [this gist](https://gist.github.com/bvis/b78c1e0841cfd2437f03e20c1ee059fe).

I strive to document all secrets in the services Readme, so this repos setup is easy to follow.

### Automatic Docker Image Updates

*wip*

I'm still experimenting with DIUN and Watchtower, trying to decide on one.


## Backup

I run backups via [borgmatic](https://github.com/borgmatic-collective/borgmatic) to [BorgBase](https://www.borgbase.com). The config for this currently lives outside this repo