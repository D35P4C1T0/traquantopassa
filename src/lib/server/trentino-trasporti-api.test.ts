import { afterEach, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/bus.json';
vi.mock('$env/dynamic/private', () => ({
	env: { API_BASE_URL: 'https://bus.test', API_USERNAME: 'fixture', API_PASSWORD: 'fixture' },
}));
import { getStops, getRoutes, getTrips, isApiTrip } from './trentino-trasporti-api';
afterEach(() => vi.unstubAllGlobals());
it('validates metadata shapes and HTTP status', async () => {
	const fetch = vi
		.fn()
		.mockResolvedValueOnce(Response.json(fixture.stops))
		.mockResolvedValueOnce(Response.json({ error: 'bad' }))
		.mockResolvedValueOnce(new Response('error', { status: 401 }));
	vi.stubGlobal('fetch', fetch);
	expect(await getStops()).toHaveLength(1);
	await expect(getRoutes()).rejects.toThrow('Invalid upstream');
	await expect(getTrips(1, 15)).rejects.toThrow('401');
});
it('validates trip dates and live values', () => {
	expect(isApiTrip(fixture.trips[0])).toBe(true);
	expect(isApiTrip({ ...fixture.trips[0], lastEventRecivedAt: 'bad' })).toBe(false);
	expect(isApiTrip({ ...fixture.trips[0], delay: null, lastEventRecivedAt: '' })).toBe(true);
});

it('filters disused stops with null routes and preserves valid stops', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			Response.json([...fixture.stops, { ...fixture.stops[0], stopId: 2, routes: null }]),
		),
	);
	expect(await getStops()).toHaveLength(1);
});
