import { afterEach, expect, it, vi } from 'vitest';
import { distance, isGeolocationGranted, getCurrentPosition } from './location-helpers';
afterEach(() => vi.unstubAllGlobals());
it('ranks nearby coordinates by physical distance', () => {
	const origin = { latitude: 46, longitude: 11 } as GeolocationCoordinates;
	expect(distance(origin, { latitude: 46, longitude: 11.01 })).toBeLessThan(
		distance(origin, { latitude: 46.008, longitude: 11 }),
	);
	expect(distance(origin, origin)).toBe(0);
});
it('handles rejected permissions and missing location API', async () => {
	vi.stubGlobal('navigator', {
		permissions: {
			query: async () => {
				throw new Error('unsupported');
			},
		},
	});
	expect(await isGeolocationGranted()).toBe(false);
	await expect(getCurrentPosition()).rejects.toThrow('unavailable');
});
