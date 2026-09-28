import { afterEach, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/bus.json';
import { mapApiTrips, getTrips } from './trips-service';
import * as api from './trentino-trasporti-api';
import * as routes from './routes-service';
const route = { id: 5, name: '5', longName: 'Centro - Povo', color: '#123456' };
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});
it('isolates malformed trips and refuses all-invalid results', () => {
	const result = mapApiTrips(
		[...fixture.trips, {}, { ...fixture.trips[0], routeId: 999 }],
		[route],
		1,
	);
	expect(result.trips).toHaveLength(1);
	expect(result.partial).toBe(true);
	for (const invalid of [
		{},
		{ ...fixture.trips[0], stopTimes: [] },
		{ ...fixture.trips[0], oraArrivoEffettivaAFermataSelezionata: 'bad' },
	]) {
		expect(() => mapApiTrips([invalid], [route], 1)).toThrow('No valid');
	}
	expect(() => mapApiTrips(fixture.trips, [route], 999)).toThrow('No valid');
	expect(mapApiTrips([], [route], 1)).toEqual({ trips: [], partial: false });
});
it('handles circular departures, terminus arrivals and repeated IDs', () => {
	const trip = {
		...fixture.trips[0],
		lastSequenceDetection: 0,
		stopTimes: [
			...fixture.trips[0].stopTimes,
			{ stopId: 1, stopSequence: 3, arrivalTime: '13:00:00' },
		],
	};
	expect(mapApiTrips([trip], [route], 1).trips[0].isEndOfRouteForUser).toBe(false);
	const arriving = { ...trip, lastSequenceDetection: 2 };
	expect(mapApiTrips([arriving], [route], 1).trips[0].userStopSequenceNumber).toBe(3);
	const later = { ...trip, oraArrivoProgrammataAFermataSelezionata: '2026-09-28T13:08:00+02:00' };
	expect(mapApiTrips([trip, later], [route], 1).trips).toHaveLength(2);
	expect(mapApiTrips([trip, trip], [route], 1).partial).toBe(true);
});
it('recalculates cached countdown and live age without fetching again', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(Date.parse('2026-09-28T12:00:00+02:00'));
	const fetchTrips = vi
		.spyOn(api, 'getTrips')
		.mockResolvedValue(
			fixture.trips.map((trip) => ({ ...trip, lastEventRecivedAt: '2026-09-28T11:56:00+02:00' })),
		);
	vi.spyOn(routes, 'getRoutesResource').mockResolvedValue({
		value: [route],
		cachedAt: new Date(),
		stale: false,
	});
	const stop = { id: 1, code: '1n', coordinates: { latitude: 46, longitude: 11 } };
	const first = await getTrips(stop);
	expect(first.value.trips[0].minutes).toBe(10);
	expect(first.value.trips[0].isOutdated).toBe(false);
	vi.setSystemTime(Date.now() + 70_000);
	fetchTrips.mockRejectedValue(new Error('offline'));
	const stale = await getTrips(stop);
	expect(stale.value.trips[0].minutes).toBe(9);
	expect(stale.stale).toBe(true);
	expect(stale.value.trips[0].isOutdated).toBe(true);
	expect(stale.cachedAt).toEqual(first.cachedAt);
});
