# Docker hosting

No database or persistent app storage is required. Favorites stay in the browser;
server caches rebuild after a restart. Bus information needs Trentino Trasporti
API credentials. Train data uses the public RFI service.

Requires Docker Engine with Compose 2.24.4+ (or Compose v5). OrbStack works on macOS.
The pinned images support amd64 and arm64. Builds use Node 24 and pnpm 12 with a
frozen lockfile; production runs as a non-root user with a read-only filesystem,
no Linux capabilities, bounded resources and rotating logs.

## Existing Traefik (recommended for this setup)

Traefik must already use the Docker provider and share an external Docker network
with this app, on the same Docker engine. No additional proxy is started.

```sh
cp .env.docker.example .env.docker
chmod 600 .env.docker
```

Edit `.env.docker`: set `DOMAIN` (hostname only), `TRAEFIK_NETWORK` to the existing
network name, `TRAEFIK_ENTRYPOINT`, and bus credentials. Set
`TRAEFIK_CERT_RESOLVER` to your existing resolver name, or leave empty when your
Traefik already supplies certificates through its entrypoint/default TLS store.
Use a unique `TRAEFIK_ROUTER` if hosting multiple copies. Point DNS at your proxy.

```sh
docker compose --env-file .env.docker \
  -f compose.yaml -f compose.traefik.yaml up -d --build --wait
```

This overlay publishes no app ports. Traefik routes HTTPS to app port 3000 over
`TRAEFIK_NETWORK`; configure HTTP-to-HTTPS redirection in your existing Traefik.
The app trusts one proxy hop for client IPs. Keep the proxy network restricted to
trusted containers. If another proxy/CDN sits ahead of Traefik, review Traefik's
trusted forwarded headers and the app's `XFF_DEPTH` for your topology.

If Traefik runs on another machine, these Docker labels/network do not connect it:
use Traefik's file provider with a privately reachable app endpoint instead.

## Alternative: standalone Caddy

Use this **instead of** the Traefik overlay. Set `DOMAIN` and API credentials in
`.env.docker` as above. DNS A/AAAA records must point to this host. Allow incoming
TCP 80/443; UDP 443 enables HTTP/3. These ports must be free.

```sh
docker compose --env-file .env.docker \
  -f compose.yaml -f compose.caddy.yaml up -d --build --wait
```

Caddy manages HTTPS certificates and redirects HTTP to HTTPS. It runs non-root on
high internal ports, retaining only the `NET_BIND_SERVICE` capability required by
the official binary. Certificate/configuration data lives in named volumes. Back
up `caddy_data`, which contains certificate private keys. Do not use `down -v`
unless deliberately deleting those volumes. This configuration needs no Docker
socket access.

## Local access without a proxy

```sh
cp .env.docker.example .env.docker
# Edit credentials, then:
docker compose --env-file .env.docker up -d --build --wait
```

Open http://localhost:3000. The base Compose binds only to loopback. If changing
`APP_PORT`, also update `PUBLIC_BASE_URL` to match. Proxy overlays set the public
URL and SvelteKit `ORIGIN` automatically from `DOMAIN`.

## Optional mounted secrets

Environment variables are simplest, but visible to Docker administrators through
container inspection. To keep bus credentials out of container configuration,
create `secrets/api_username` and `secrets/api_password`, each containing one
nonempty line. A final newline is removed; password spaces are preserved.

Keep the host `secrets` directory private (`chmod 700 secrets`). File mounts must
be readable by container UID 1000: for example, use `chmod 444 secrets/api_*`
inside that private directory. Compose file secrets are bind mounts, not an
encrypted secret store; protect the host and backups accordingly.

Add the secrets overlay last:

```sh
docker compose --env-file .env.docker \
  -f compose.yaml -f compose.traefik.yaml -f compose.secrets.yaml \
  up -d --build --wait
```

Replace the Traefik overlay with Caddy if desired. `API_USERNAME_SECRET_FILE` and
`API_PASSWORD_SECRET_FILE` can override the host file paths. The entrypoint also
supports `GOATCOUNTER_API_KEY_FILE` when explicitly mounted/configured. Conflicting
direct/file values fail startup. `.env*` and secret directories are excluded from
the build context; no build-time credentials are needed.

## Operations and verification

Use the same `--env-file` and `-f` options for `ps`, `logs -f --tail=100`, `up` and
`down`. `/healthz` measures app availability independently of upstream providers.
Docker marks an unhealthy process but does not restart it just for being unhealthy;
`restart: unless-stopped` restarts exited processes. Shutdown gives the app 30
seconds to drain requests. Default limits are 512 MiB/1 CPU and can be adjusted via
`APP_MEMORY_LIMIT` and `APP_CPUS` after observing your workload.

Image digests are pinned intentionally. Review and update Node/pnpm/Caddy tags and
digests for security releases, then rebuild with `up -d --build --wait`. Keep the
pnpm image version aligned with `packageManager` and the lockfile. Updating a
single app container can briefly interrupt service; this is not a rolling cluster.

Run the same deterministic container smoke test as CI:

```sh
node --test docker/entrypoint.test.mjs
docker build -t traquantopassa:docker-test .
sh scripts/docker-smoke.sh
```

The smoke test uses an isolated Compose project, no published ports, fixture API
responses and disposable containers. It checks health, bus/train pages and APIs,
runtime URLs, non-root/read-only operation and dropped capabilities. It does not
validate your external Traefik instance, public DNS or certificate issuance.

References: [pnpm Docker builds](https://pnpm.io/docker),
[Traefik Docker routing](https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/),
[Compose secrets](https://docs.docker.com/reference/compose-file/secrets/),
[Caddy global options](https://caddyserver.com/docs/caddyfile/options).
