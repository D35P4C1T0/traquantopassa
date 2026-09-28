#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Unique project, no published ports, no real credentials or external requests.
project="tqp-smoke-$$"
compose() {
  docker compose --env-file .env.docker.example -p "$project" \
    -f compose.yaml -f docker/compose.test.yaml "$@"
}
cleanup() { compose down --timeout 25; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
compose up -d --no-build --wait --wait-timeout 60
compose exec -T app node docker/assert-container.mjs
