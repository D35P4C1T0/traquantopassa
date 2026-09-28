import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResourceCache } from './resource-cache';
afterEach(() => vi.useRealTimers());

describe('ResourceCache', () => {
	it('shares simultaneous misses and retries after failed initialization', async () => {
		const cache = new ResourceCache<number>(100, 200);
		const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(7);
		const first = cache.get('a', load);
		expect(cache.get('a', load)).toBe(first);
		await expect(first).rejects.toThrow('offline');
		expect((await cache.get('a', load)).value).toBe(7);
		expect(load).toHaveBeenCalledTimes(2);
	});
	it('retains original timestamp, backs off failures, and refuses expired data', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		const cache = new ResourceCache<number>(100, 200);
		const load = vi.fn().mockResolvedValueOnce(7).mockRejectedValue(new Error('offline'));
		const first = await cache.get('a', load);
		vi.setSystemTime(1150);
		const stale = await cache.get('a', load);
		expect(stale.stale).toBe(true);
		expect(stale.cachedAt).toEqual(first.cachedAt);
		await cache.get('a', load);
		expect(load).toHaveBeenCalledTimes(2);
		vi.setSystemTime(1201);
		await expect(cache.get('a', load)).rejects.toThrow('offline');
	});
	it('refreshes successfully and bounds entries', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		const cache = new ResourceCache<number>(100, 200, 1);
		await cache.get('a', async () => 1);
		vi.setSystemTime(1150);
		expect((await cache.get('a', async () => 2)).stale).toBe(false);
		await cache.get('b', async () => 3);
		const load = vi.fn(async () => 4);
		await cache.get('a', load);
		expect(load).toHaveBeenCalledOnce();
	});
});
