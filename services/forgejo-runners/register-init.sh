#!/bin/sh
# Idempotent Forgejo runner registration.
#
# An existing /data/.runner is authoritative: if present we do nothing, so
# tearing down and rebuilding the stack preserves the current registration and
# never leaves an orphaned runner in Forgejo's admin UI.
#
# If it is absent, register non-interactively. That is what lets this stack be
# recreated from nothing -- the previous design depended on a .runner file that
# existed only because someone registered it by hand in July.
set -eu

if [ -f /data/.runner ]; then
  echo "register-init: /data/.runner present — preserving existing registration."
  exit 0
fi

if [ -z "${FORGEJO_RUNNER_TOKEN:-}" ]; then
  cat >&2 <<'MSG'
register-init: /data/.runner is missing and FORGEJO_RUNNER_TOKEN is not set.

Get a registration token from Forgejo:
  Site Administration -> Actions -> Runners -> Create new runner

Then bring the stack up with it:
  FORGEJO_RUNNER_TOKEN=xxxxx docker compose up -d
MSG
  exit 1
fi

echo "register-init: registering ${RUNNER_NAME} against ${FORGEJO_INSTANCE_URL}"
exec forgejo-runner register --no-interactive \
  --instance "${FORGEJO_INSTANCE_URL}" \
  --token    "${FORGEJO_RUNNER_TOKEN}" \
  --name     "${RUNNER_NAME}" \
  --labels   "trails-runner:docker://node:24-bookworm,ubuntu-latest:docker://catthehacker/ubuntu:act-22.04,playwright:docker://mcr.microsoft.com/playwright:v1.61.1-noble"
