import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('./rfi-api', () => ({ getStations: vi.fn(), getIdFromSlug: vi.fn() }));
import { getStations, getIdFromSlug } from './rfi-api';
beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	vi.useRealTimers();
});
const station = {
	slug: 'test',
	name: 'Test',
	coordinates: { latitude: 46, longitude: 11 },
	province: 'TN',
	region: 'TAA',
	city: 'Test',
};
it('curated station does not depend on catalog availability', async () => {
	const { getStationBySlug } = await import('./stations-service');
	expect((await getStationBySlug('trentofs'))?.id).toBe('2912');
	expect(getStations).not.toHaveBeenCalled();
});
it('retries failed catalog initialization and shares concurrent requests', async () => {
	vi.mocked(getStations).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([station]);
	vi.mocked(getIdFromSlug).mockResolvedValue('123');
	const { getStationBySlug } = await import('./stations-service');
	await expect(getStationBySlug('test')).rejects.toThrow('offline');
	const results = await Promise.all([getStationBySlug('test'), getStationBySlug('test')]);
	expect(results.map((item) => item?.id)).toEqual(['123', '123']);
	expect(getStations).toHaveBeenCalledTimes(2);
	expect(getIdFromSlug).toHaveBeenCalledOnce();
});
it('missing ID is retried after bounded negative caching', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(1000);
	vi.mocked(getStations).mockResolvedValue([station]);
	vi.mocked(getIdFromSlug).mockResolvedValueOnce(null).mockResolvedValue('123');
	const { getStationBySlug } = await import('./stations-service');
	expect(await getStationBySlug('test')).toBeNull();
	expect(await getStationBySlug('test')).toBeNull();
	vi.setSystemTime(61_001);
	expect((await getStationBySlug('test'))?.id).toBe('123');
	vi.useRealTimers();
});
