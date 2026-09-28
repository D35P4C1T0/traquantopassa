# Reliability, self-hosting, and maintenance plan

Status: implemented locally on `improve-reliability-self-hosting`; final validation recorded below.

User-directed changes to execution: implementation performed directly, without Flash;
package management migrated to pnpm 12.6.0. `origin` is the D35P4C1T0 fork and
`upstream` retains the original repository. No commits, push, or deployment performed.

## Objective

Make transport boards trustworthy during upstream failures, improve self-hosting,
and strengthen regression coverage while retaining the current SvelteKit architecture.
Preserve existing routes, Italian UI, favorites, transport-specific behavior, and
the distinction between scheduled and live data.

## Review baseline

The review covered routes, components, server services, browser storage, configuration,
CI, and the dependency lockfile.

- Stack: Svelte 5, SvelteKit 2, Tailwind 4, TypeScript, Node adapter, Node 24.
- Lockfile at review: Vite 7.3.5; `@types/node` 25.9.4.
- No database; caches are process-local and preferences are browser-local.
- Bus data uses authenticated Trentino Trasporti endpoints; train data is parsed
  from public RFI HTML.
- Two isolated reproductions confirmed incomplete station-cache initialization after
  an upstream failure and incorrect nearby ordering from degree-based distance.
- Full tests, lint, checks, and production build were not run during review:
  dependencies were absent and the local runtime was Node 26 rather than required Node 24.
- Other findings below are based on source inspection, not production incident evidence.

## Architecture decision

Keep Svelte 5, SvelteKit 2, Tailwind 4, Node 24, and the single-process deployment.
A framework rewrite does not address the identified problems. Do not add a database,
distributed cache, or separate backend without a concrete need.

Use small shared utilities for upstream requests, validation, cache behavior, and
browser refresh where they remove duplicated failure handling. Keep provider-specific
parsing and transport rules in their existing service modules.

## Phase 1 — Establish reproducible validation

- [x] Pin the development runtime to Node 24 using a repository runtime-version file.
- [x] Align `@types/node` with Node 24.
- [x] Install using the committed lockfile and record baseline check results.
- [x] Migrate to pnpm with a committed `pnpm-lock.yaml`, pinned package-manager version, and `pnpm install --frozen-lockfile` in CI.
- [x] Add the production build to CI; the current “Build and test” workflow does not build.
- [x] Add a production-server smoke check with controlled upstream responses and no
      real credentials or external provider dependency.
- [x] Establish reusable bus JSON and RFI HTML fixtures for subsequent regression tests.

Relevant files: `package.json`, `pnpm-lock.yaml`, `.github/workflows/build.yml`,
`vite.config.ts`, `src/lib/server/trains-service.test.ts`.

Acceptance:

- A fresh Node 24 checkout can install, lint, type-check, test, and build reproducibly.
- Smoke verification starts the built server, checks a response, and shuts it down.
- Existing failures are documented separately from changes introduced by this work.

## Phase 2 — Validate upstream data and fix initialization

### RFI response integrity

Finding: `rfi-api.ts` parses responses without checking HTTP status or the expected
board structure. An upstream error page can become an empty train list and display
“Nessun treno previsto.”

- [x] Check status before parsing all provider responses.
- [x] Validate recognizable RFI board structure, including a legitimate empty board.
- [x] Distinguish upstream unavailability, invalid data, and valid empty results.
- [x] Validate bus JSON at the provider boundary; TypeScript interfaces alone do not
      validate received payloads. Choose focused guards or a small schema library.
- [x] Preserve request timeouts and include useful provider/error context in logs.
- [x] Add fixtures for normal, empty, malformed, and error responses, including
      cancellations, replacement buses, missing notes, and subsequent stops.

### Station initialization

Finding: `stations-service.ts` mutates the shared map before awaiting the RFI catalog.
A failed fetch leaves a nonempty partial map that suppresses retries. Concurrent
requests can observe the partially initialized map. A missing station ID also causes
an entry to be deleted for the remainder of the process lifetime.

- [x] Keep curated stations available independently of remote catalog loading.
- [x] Share one in-flight catalog initialization promise.
- [x] Build remote results separately and publish a complete successful result atomically.
- [x] Clear failed initialization state so a later request can retry.
- [x] Use bounded negative caching for missing IDs instead of permanent removal after
      a potentially temporary upstream response.
- [x] Test concurrent initialization, initial failure followed by recovery, curated
      station availability, and temporarily missing IDs.

### Bus trip robustness

Finding: `trips-service.ts` assumes route lookup succeeds, stop times are nonempty,
the selected stop exists, and dates are valid. One malformed trip can fail the board.

- [x] Guard these assumptions and isolate invalid trips.
- [x] Represent partial data explicitly; do not present discarded invalid data as a
      successfully empty board.
- [x] Preserve circular-route and terminus behavior.
- [x] Test missing routes/stops, empty stop times, invalid dates, stale live updates,
      circular routes, repeated trip IDs, and terminus arrivals.

### Startup resilience

Finding: `hooks.server.ts` launches an external-IP request without a timeout or
rejection handler. Failure can produce an unhandled rejection and terminate Node.

- [x] Remove this optional lookup, or make it explicitly optional, bounded, and caught.
- [x] Ensure diagnostics cannot prevent startup or make builds depend on external access.
- [x] Verify startup with outbound requests failing.

Acceptance:

- Error HTML never appears as a successful empty train board.
- Station initialization recovers after failure without restarting the process.
- One malformed trip does not discard other valid trips.
- Upstream failures produce controlled application states, not unhandled rejections.

## Phase 3 — Cache and refresh reliability

Finding: concurrent cache misses duplicate upstream calls. Expiration discards useful
data during outages. Bus waiting minutes are calculated before caching, so cached
relative times age without being recalculated.

- [x] Deduplicate in-flight requests by resource key, including arrivals/departures.
- [x] Release in-flight state on both success and failure.
- [x] Retain last-known-good data within a documented maximum stale age.
- [x] Keep original fetch timestamps and expose freshness/partial status to the UI.
- [x] Show a visible stale warning and age; never label stale data as current.
- [x] Define separate freshness limits for metadata and live boards. Stop displaying
      predictions as usable live data after the agreed maximum stale age.
- [x] Cache absolute arrival timestamps and derive waiting minutes from the current time.
- [x] Share refresh behavior across bus and train pages: preserve 30-second refresh,
      pause while hidden, refresh on return, prevent overlapping requests, and handle
      failures without silently misrepresenting freshness.
- [x] Test cache hits, simultaneous misses, failed requests, recovery, stale limits,
      countdown aging, and visibility transitions with controlled clocks.

Relevant files: `src/lib/server/*-service.ts`, `src/lib/server/resource-cache.ts`,
`src/lib/Trip.ts`, bus and train `+page.server.ts` and `+page.svelte` files.

Acceptance:

- Concurrent requests for the same uncached resource share one upstream operation.
- Failed refreshes preserve only bounded, clearly labeled last-known data.
- Cached arrival predictions calculate the correct remaining wait when served.
- Refresh timers and pending state are cleaned up when leaving a page.

## Phase 4 — Browser correctness and accessibility

### Location and storage

- [x] Replace Euclidean latitude/longitude degree distance in `location-helpers.ts`
      with Haversine distance. The current formula can reverse nearby ordering.
- [x] Add a geolocation timeout and handle unavailable APIs and rejected permission queries.
- [x] Recover UI loading state after location failure and permit retry.
- [x] Catch browser storage read/write failures in favorites and tab preferences.
- [x] Validate stored favorites as string arrays and tabs against allowed values.
- [x] Fall back safely for malformed JSON, unexpected values, and unavailable storage.
- [x] Preserve existing storage keys and saved favorites.

### Controls and motion

- [x] Separate favorite buttons from enclosing links in `StopBlock.svelte` and
      `StationBlock.svelte`.
- [x] Use native buttons for expandable trip rows where practical; ensure Space
      activates without scrolling the page.
- [x] Supply meaningful accessible names and state for favorite and selection controls.
- [x] Add text alternatives for live/stale indicators rather than relying only on color.
- [x] Respect reduced-motion preferences for polling transitions, live indicators,
      and favorite animations.
- [x] Add focused browser tests for favorites, keyboard expansion, saved preferences,
      denied geolocation, and visibility-aware refresh.

Acceptance:

- Distance regression example ranks the physically nearer stop first.
- Corrupt or blocked storage does not break page interactions.
- Main flows work with keyboard controls and understandable accessible labels.
- Reduced-motion preference suppresses unnecessary animation.

## Phase 5 — Self-hosting configuration and operations

### Optional analytics

Finding: `stops-ranking-service.ts` calls GoatCounter without checking whether a key
exists, then leaves fallback rankings uncached. An unconfigured host can repeatedly
wait for failed requests, up to the three-second timeout per homepage request.

- [x] Skip analytics requests when unconfigured.
- [x] Cache fallback rankings for a bounded period after errors.
- [x] Make analytics endpoint/site settings configurable instead of using the original host.
- [x] Load the analytics browser script only when enabled.

### Deployment settings

- [x] Centralize public URL and deployment-specific settings.
- [x] Replace the hardcoded sitemap domain with configured public URL.
- [x] Resolve `.env.production` supplying the original domain and document build-time
      versus runtime settings. Canonical URLs currently use `$env/static/public`.
- [x] Add a safe `.env.example` with required bus API credentials and optional analytics settings.
- [x] Validate required configuration with clear errors and no secret values in logs.
- [x] Add a lightweight health endpoint that does not call transport providers.
- [x] Document Node 24, reproducible build/start commands, HTTPS reverse proxy setup,
      origin/port settings, process supervision, outbound access, and in-memory cache behavior.
- [x] Review proxy-address logging: only trust forwarded addresses from the configured
      proxy boundary, rather than arbitrary client headers.

Acceptance:

- A custom-domain deployment emits its own canonical and sitemap URLs.
- Disabling analytics causes no GoatCounter browser or server requests.
- An unavailable analytics service does not repeatedly delay homepage requests.
- Deployment documentation can be followed without original-author infrastructure,
      except for the explicitly required transport-provider credentials.

## Phase 6 — Evaluate incremental tooling upgrades

Perform after correctness and regression coverage improvements.

- [x] Evaluate Vite 8 with a compatible Svelte Vite plugin and the existing SvelteKit version.
- [x] Review changed bundler behavior, dynamic SVG imports, SSR output, and browser targets.
- [x] Compare build time, output size, and production behavior against the baseline.
- [x] Keep the upgrade only after lint, checks, tests, production build, and browser
      smoke checks pass. Do not assume faster builds imply faster transport responses.
- [x] Keep Node 24 LTS unless a separate compatibility or support requirement justifies migration.
- [x] Avoid unrelated framework, runtime, or infrastructure migrations; pnpm migration is explicitly user-requested.

References checked during review:

- [Vite migration from v7](https://vite.dev/guide/migration)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)
- [Node.js release schedule](https://github.com/nodejs/Release)
- [SvelteKit Node adapter deployment](https://svelte.dev/docs/kit/adapter-node)

## Delivery and completion

Implement in dependency order. Add behavioral regression tests alongside each fix;
avoid tests that only repeat implementation details. Use mocked upstream fixtures
for repeatable checks, with any real-provider verification kept separate.

The user explicitly requested direct implementation without Flash. That instruction
overrides the default delegated workflow for this task. Commit, push, deployment,
and paid setup remain outside this implementation scope.

Completion requires:

- [x] All accepted phase checks pass under Node 24.
- [x] Existing URLs, favorites, bus directions, arrivals/departures, and trip details remain usable.
- [x] Fresh, stale, partial, empty, and unavailable states remain distinguishable.
- [x] Deployment instructions match the resulting configuration behavior.
- [x] Final report identifies completed work, deferred items, verification evidence,
      and any remaining provider-dependent limitations.


## Implementation record

- Added bounded `ResourceCache` with in-flight deduplication, ten-second retry backoff,
  original fetch timestamps, 29-second live freshness, 120-second maximum live age,
  and 24-hour/seven-day metadata bounds. Removed `node-cache` and `CachedItem`.
- Added provider response guards, atomic/retryable station catalog loading, bounded
  missing-ID caching, and isolation of malformed/duplicate bus trips.
- Polling now calls `/api/stops/[stop]` and `/api/stations/[station]?arrivals=1`.
  Shared board services serve both SSR and JSON. This replaces `invalidateAll()`,
  whose error-page navigation could stop polling after a failed refresh.
- Added visible stale/partial/metadata warnings and client-side prediction expiry,
  including offline recovery without losing the refresh loop.
- Hardened storage, location handling, native keyboard controls and reduced motion.
- Centralized runtime deployment URLs, made analytics optional, removed external-IP
  startup lookup, added health endpoint and self-hosting documentation.
- Migrated to pnpm 12.6.0, Node 24 types, Vite 8.3.1, Svelte Vite plugin 7.3.1,
  and Tailwind's dedicated Vite plugin. The previous PostCSS integration failed
  Vite 8 CSS import resolution; the dedicated plugin resolved it.
- Added fixture-based unit tests, production smoke verification, Chromium browser
  tests, and CI steps for all checks. Browser fixtures require no transport credentials.

### Verification evidence

Run locally with Node 24.21.0 and pnpm 12.6.0:

- Frozen dependency install passed, with esbuild as the only allowed dependency build script.
- Production build passed with Vite 8; static checks and test totals are recorded in
  `CHECKPOINT.md` after the final validation pass.
- Production smoke passed for homepage, bus board, train list, departures, arrivals,
  both JSON endpoints, sitemap, health, runtime public URL, disabled analytics, and invalid route.
- All five Chromium scenarios passed: four in the full run, then the remaining
  favorites/keyboard scenario after correcting an ambiguous test selector.
- Mobile train screenshot was visually inspected: layout and controls rendered correctly.
- Public RFI sample independently parsed 20 trains; current station catalog contained
  2,116 entries and all passed the new metadata guard. These were one-time public
  compatibility checks; regular tests use fixtures.
- Single local build observations: Vite 7 reported 5.01 seconds and Vite 8 initially
  reported 2.96 seconds. Output disk usage was 752/1,100 KiB client/server before the
  upgrade and 720/1,156 KiB afterward. These are development observations with nearby
  source changes, not a controlled benchmark or a promise of faster page loads.

### Remaining verification limits

- Real authenticated Trentino Trasporti data was not requested; bus behavior is covered
  by representative fixtures and regression cases.
- Linux GitHub Actions execution and live deployment were not performed. CI configuration
  contains the locally exercised verification commands plus Linux browser dependencies.
- RFI remains a public HTML integration; future provider changes can require parser updates.
- No accepted implementation phase is intentionally deferred.
