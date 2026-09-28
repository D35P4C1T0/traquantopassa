# Implementation checkpoint

Status: implementation complete locally; ready for user review.

## Workspace

- Repository: `/Users/matteo/Documents/prog/js/traquantopassa`
- Branch: `improve-reliability-self-hosting`
- Baseline: `f96a71be3b9223d0ccae3f5bedd6544e2eb356f6`
- `origin`: `https://github.com/D35P4C1T0/traquantopassa.git`
- `upstream`: `https://github.com/matteocontrini/traquantopassa.git`
- Changes are unstaged and uncommitted, including new files. No push or deployment.
- Flash was interrupted on the user's instruction before it made changes. All implementation
  was performed directly. No active implementation worker remains.

## Completed scope

All six phases of PLAN.md, with the user's pnpm preference incorporated:

- Node 24, pnpm 12.6.0, frozen lockfile installation and CI verification.
- Provider validation, station-cache recovery and isolated malformed bus trips.
- Bounded metadata/live caches, deduplicated requests, absolute arrival timestamps.
- JSON polling with failure recovery, visibility handling and explicit stale/partial states.
- Storage/geolocation resilience, keyboard controls, reduced motion and distance correction.
- Runtime self-hosting configuration, optional analytics, health endpoint and deployment docs.
- Vite 8.3.1, compatible Svelte plugin, dedicated Tailwind Vite integration.

## Verification

Local runtime: Node 24.21.0. Package manager: pnpm 12.6.0.

- `pnpm install --frozen-lockfile --offline`: passed against final lockfile.
- `pnpm check`: passed; zero errors, zero warnings.
- `pnpm test`: passed; 31 tests across 10 files.
- `pnpm lint`: passed during final validation; formatting and diff checks also performed.
- `pnpm build`: passed with Vite 8, including the final UI changes.
- `pnpm smoke`: passed against Vite 8 with both JSON endpoints, HTML routes, sitemap,
  health, runtime URL, disabled analytics and invalid-route handling.
- Five Chromium browser scenarios passed across the full run and targeted reruns.
  The initial keyboard test selector was ambiguous and corrected; actual keyboard
  expansion passed. Final targeted checks cover favorites, reduced motion, stale expiry
  and refresh recovery after the last UI cleanup.
- Mobile train and bus screenshots reviewed using fixture data.
- One public RFI board parsed 20 trains. All 2,116 entries in a public RFI station catalog
  passed validation. These checks used no private credentials.

## Limits and resume action

No implementation phase intentionally deferred. Real authenticated bus-provider access,
Linux GitHub Actions execution, and deployment remain unverified. RFI markup can change.

Next action: review the unstaged diff and new files with the user. Commit, push or deploy
only if requested. For further implementation, use pnpm and Node 24, preserve this working
branch, and continue directly without Flash unless the user changes that instruction.

## Docker hosting follow-up

Added a digest-pinned multi-stage Node 24/pnpm 12 image, hardened Compose app,
existing-Traefik overlay, alternative Caddy HTTPS overlay, optional file secrets,
and `docker/README.md`. CI now builds and smoke-tests the container. Health probes
bypass request-IP logging so proxy-mode probes work without forwarded headers.

Verified on OrbStack (Linux arm64): image build; isolated container smoke including
bus/train HTML and JSON routes, runtime URL, non-root/read-only/capability checks;
Caddy non-root startup with persistent volumes, local HTTPS bus page and health,
and correct HTTP-to-HTTPS redirect. Secrets unit tests pass. Final lint and
Svelte checks pass (zero errors/warnings). Compose variants validate. Test stacks
and test certificate volumes removed; image/build caches retained. Real external
Traefik routing, public ACME issuance, amd64 runtime and CI execution remain
unverified. No production deployment, commit or push performed.
