# Caddy

## Docker Proxy

This Caddy is build with the [caddy-docker-proxy](https://github.com/lucaslorentz/caddy-docker-proxy) extension. See the Readme.md at the repo root for more context.

## S3 Proxy

This Caddy also builds with the S3 proxy extension. This allows other services (i.e. Mastodon) to access S3 buckets in a decouopled fashion, proxied through our own domain.

### Secrets

- `secrets/AWS_ACCESS_KEY_ID`: AWS Key ID for S3 Proxy
- `secrets/AWS_SECRET_ACCESS_KEY`: AWS Key Secret for S3 Proxy

Those secrets are getting expanded into the environment of the caddy processs by the `with-expanded-env.sh` script.