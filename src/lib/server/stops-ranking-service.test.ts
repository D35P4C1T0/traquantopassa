import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ GOATCOUNTER_API_KEY: '', GOATCOUNTER_URL: '' }));
vi.mock('$env/dynamic/private', () => ({ env: config }));
beforeEach(() => {
	vi.resetModules();
	config.GOATCOUNTER_API_KEY = '';
	config.GOATCOUNTER_URL = '';
});
afterEach(() => vi.unstubAllGlobals());
it('never contacts analytics when unconfigured', async () => {
	const fetch = vi.fn();
	vi.stubGlobal('fetch', fetch);
	const { getRankings } = await import('./stops-ranking-service');
	expect(Object.keys(await getRankings([])).length).toBeGreaterThan(0);
	expect(fetch).not.toHaveBeenCalled();
});
it('shares and caches fallback after configured analytics fails', async () => {
	config.GOATCOUNTER_API_KEY = 'fixture';
	config.GOATCOUNTER_URL = 'https://analytics.example';
	const fetch = vi.fn(async () => new Response('error', { status: 503 }));
	vi.stubGlobal('fetch', fetch);
	const { getRankings } = await import('./stops-ranking-service');
	await Promise.all([getRankings([]), getRankings([])]);
	await getRankings([]);
	expect(fetch).toHaveBeenCalledOnce();
});
