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

it('recognizes previous trips and treats vehicle IDs as optional metadata', () => {
	const previous = { ...fixture.trips[0], stopNext: 0, matricolaBus: 1234 };
	const mapped = mapApiTrips([previous], [route], 1).trips[0];
	expect(mapped.currentStopSequenceNumber).toBe(-1);
	expect(mapped.vehicleId).toBe('1234');
	for (const matricolaBus of [null, undefined, 'bad', -1, 1.5]) {
		expect(mapApiTrips([{ ...previous, matricolaBus }], [route], 1).trips[0].vehicleId).toBeNull();
	}
	const scheduled = { ...previous, delay: null, lastSequenceDetection: 0 };
	expect(mapApiTrips([scheduled], [route], 1).trips[0].currentStopSequenceNumber).toBe(0);
});

it('filters bogus early predictions without marking intentional empty boards as invalid', () => {
	const trip = {
		...fixture.trips[0],
		delay: -6,
		lastSequenceDetection: 4,
		stopTimes: Array.from({ length: 5 }, (_, i) => ({
			stopId: i + 1,
			stopSequence: i + 1,
			arrivalTime: '12:08:00',
		})),
	};
	expect(mapApiTrips([trip], [route], 1)).toEqual({ trips: [], partial: false });
	// The thresholds are strict: five minutes early or only two stops ahead stay visible.
	expect(mapApiTrips([{ ...trip, delay: -5 }], [route], 1).trips).toHaveLength(1);
	expect(mapApiTrips([{ ...trip, lastSequenceDetection: 3 }], [route], 1).trips).toHaveLength(1);
	expect(mapApiTrips([{ ...trip, lastSequenceDetection: 5 }], [route], 4).trips).toHaveLength(0);
	expect(mapApiTrips([{ ...trip, stopNext: 0 }], [route], 1).trips).toHaveLength(1);
	expect(mapApiTrips([trip, {}], [route], 1)).toEqual({ trips: [], partial: true });
	expect(() => mapApiTrips([{}], [route], 1)).toThrow('No valid');
});

it('names terminal directions and exposes live timestamps without requiring vehicle data', async () => {
	vi.spyOn(api, 'getTrips').mockResolvedValue(fixture.trips);
	vi.spyOn(routes, 'getRoutesResource').mockResolvedValue({
		value: [route],
		cachedAt: new Date(),
		stale: false,
	});
	const result = await getTrips({
		id: 1,
		code: '1c',
		coordinates: { latitude: 46, longitude: 11 },
	});
	expect(result.value.name).toBe('Capolinea');
	expect(result.value.trips[0].lastUpdatedTimestamp).toBe(
		Date.parse(fixture.trips[0].lastEventRecivedAt),
	);
	expect(result.value.trips[0].vehicleId).toBeNull();
});
