# Patched CA bundle (eMudhra stopgap)

`ca-certificates.crt` is Alpine `ca-certificates-bundle 20261020-r0`, which drops
"emSign ECC Root CA - G3" and "AAA Certificate Services" after the eMudhra
intermediate CA compromise (disclosed 2026-10-20).

It is bind-mounted read-only over `/etc/ssl/certs/ca-certificates.crt` in images
that have no package manager (distroless/scratch) and no fixed upstream release
yet. Remove each mount once its upstream image ships a fixed store.

Regenerate:

    docker run --rm alpine:3.23 sh -c 'apk upgrade -q --no-cache ca-certificates-bundle >/dev/null && cat /etc/ssl/certs/ca-certificates.crt' > ca-certificates.crt
