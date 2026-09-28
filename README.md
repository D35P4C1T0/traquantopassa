# Tra quanto passa

Live bus arrival boards for Trento/Lavis and train arrivals/departures from RFI.
Built with Svelte 5, SvelteKit 2, TypeScript, Tailwind CSS and Vite 8, served by a single Node process.

## Requirements

- Node.js 24 (see `.nvmrc`).
- pnpm 12.6.0 (pinned in `package.json`).
- Trentino Trasporti API credentials for bus pages. Obtain these from the provider;
  this repository does not provision accounts. Train pages use public RFI data.
- Outbound HTTPS access to the configured bus API, `www.rfi.it`, and `iechub.rfi.it`.
- No database or Redis required.

Install the pinned pnpm release using your preferred package-manager installation
method, then use pnpm for all repository commands. The old npm lockfile has been
replaced by `pnpm-lock.yaml`; CI uses a frozen install.

## Development

Copy `.env.example` to `.env` and fill in bus credentials. Never commit secrets.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The pnpm build-script allowlist permits only esbuild's required installation script.

## Verification

```sh
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm smoke
pnpm exec playwright install chromium
pnpm test:browser
```

`pnpm smoke` starts the production build on loopback port 4174 using fixture data,
checks health, bus/train routes, sitemap and runtime configuration, then stops it.
Browser tests use port 4173 and the same fixtures. Neither requires real credentials
or transport-provider access. Browser installation itself requires internet access.
On Linux CI, use `pnpm exec playwright install --with-deps chromium`.

Fixtures and the fetch interceptor live under `tests/`; the interceptor is loaded
only in test subprocesses with `--import`, never by normal production startup.

Use `pnpm format` to apply formatting. CI runs lint, checks, unit tests, production
build, smoke verification, and Chromium browser tests.

## Self-hosting

Build with development dependencies installed, then run the built server:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`pnpm start` loads `.env` through dotenv. Set these runtime values for your host:

```dotenv
PUBLIC_BASE_URL=https://transport.example
ORIGIN=https://transport.example
HOST=127.0.0.1
PORT=3000
API_BASE_URL=https://app-tpl.tndigit.it
API_USERNAME=your-username
API_PASSWORD=your-password
```

`PUBLIC_BASE_URL` controls canonical and sitemap URLs. If omitted, the request origin
is used. Public URL and analytics configuration are read at runtime, so the same
build can serve another domain without rebuilding. `.env.production` contains no
author-specific domain. `ORIGIN` tells the Node adapter the externally visible origin.
The three bus API settings are validated when bus data is requested; train pages
and `/healthz` can operate independently of bus credentials.

Put an HTTPS reverse proxy in front of port 3000. Example Caddy configuration:

```caddyfile
transport.example {
    reverse_proxy 127.0.0.1:3000
}
```

Use a process supervisor to restart the app after failure or reboot. Example systemd
unit (adjust account and paths; deploy the built files and installed dependencies):

```ini
[Unit]
Description=Tra quanto passa
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=transport
WorkingDirectory=/srv/traquantopassa
ExecStart=/usr/bin/node -r dotenv/config build
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

`GET /healthz` returns a no-cache JSON liveness response without contacting providers.
It does not assert transport-provider availability. Logs go to stdout/stderr.

By default request logging uses the direct peer address. Set `ADDRESS_HEADER` and
`XFF_DEPTH` only when the server is reachable exclusively through a trusted proxy
that sanitizes/sets the forwarded address chain. For one trusted proxy, the usual
settings are `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`. Never expose the
Node port directly while trusting client-supplied forwarded headers.

### Optional analytics

Leave `GOATCOUNTER_URL` and `GOATCOUNTER_API_KEY` empty to disable analytics completely.
The app then uses built-in stop popularity rankings, makes no GoatCounter requests,
and loads no analytics script.

To enable your own GoatCounter site, set `GOATCOUNTER_URL=https://your-site.goatcounter.com`.
This enables the browser counter; set `GOATCOUNTER_API_KEY` as well to fetch rankings
from that site's API. The key stays server-side. Ranking failures fall back locally
and are cached for five minutes.

### Freshness and failure behavior

- Live bus and train boards are fresh for 29 seconds. Failed refreshes may serve
  clearly labeled last-known data up to 120 seconds old; older predictions are hidden.
- Bus/route metadata is fresh for 24 hours, with a maximum retained age of seven days.
  Bus pages show a warning when retained metadata is used.
- Concurrent requests for one resource share one upstream fetch. Failed live refreshes
  have a short retry backoff while bounded cached data remains available.
- JSON board polling runs every 30 seconds after a completed refresh, pauses in hidden tabs,
  and resumes immediately when visible. Failed updates and partial data are labeled.
- Bus waiting times are recalculated from absolute arrival timestamps when served.
- Caches are bounded, process-local, and lost on restart. Multiple instances maintain
  independent caches; deploy one instance unless there is a demonstrated scaling need.
- Favorites and tab preferences stay in each visitor's browser. Location is used
  locally for distance sorting and is not sent to this server.

RFI data depends on public HTML structure; upstream markup changes may require a
parser update. An unrecognized or failed response is treated as unavailable, not
as an empty timetable.

See [PLAN.md](PLAN.md) for implementation scope and verification status.

## Docker hosting

See [Docker hosting](docker/README.md) for a hardened Node/pnpm image, an existing
Traefik setup, an optional standalone Caddy HTTPS setup, and mounted secrets.
