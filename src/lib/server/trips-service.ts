import { ResourceCache, LIVE_FRESH_MS, LIVE_MAX_AGE_MS } from './resource-cache';
import type { StopDirection } from '$lib/StopDirection';
import * as api from '$lib/server/trentino-trasporti-api';
import * as routesService from '$lib/server/routes-service';
import type { Stop } from '$lib/Stop';
import type { Route } from '$lib/Route';
import type { Trip, StopTime } from '$lib/Trip';
import * as logger from '$lib/logger';
import { getStopName } from '$lib/server/stops-service';

interface StoredTrip extends Omit<Trip, 'minutes' | 'isOutdated' | 'lastUpdatedTimestamp'> {
	expectedAt: number;
	lastLiveAt: number | null;
}
interface StoredDirection {
	name: string;
	trips: StoredTrip[];
	partial: boolean;
}
const cache = new ResourceCache<StoredDirection>(LIVE_FRESH_MS, LIVE_MAX_AGE_MS);

export async function getTrips(stop: Stop) {
	const metadata = await routesService.getRoutesResource();
	const result = await cache.get(String(stop.id), async () => {
		const rawTrips = await api.getTrips(stop.id, 16);
		const mapped = mapApiTrips(rawTrips, metadata.value, stop.id);
		return { name: directionName(stop), ...mapped };
	});
	const direction: StopDirection = {
		name: result.value.name,
		trips: result.value.trips.map(({ expectedAt, lastLiveAt, ...trip }) => ({
			...trip,
			minutes: Math.max(0, Math.ceil((expectedAt - Date.now()) / 60_000)),
			lastUpdatedTimestamp: lastLiveAt,
			isOutdated: lastLiveAt !== null && Date.now() - lastLiveAt > 300_000,
		})),
	};
	return {
		...result,
		value: direction,
		partial: result.value.partial,
		metadataStale: metadata.stale,
	};
}

export function mapApiTrips(rawTrips: unknown[], routes: Route[], userStopId: number) {
	const trips: StoredTrip[] = [];
	for (const raw of rawTrips) {
		if (!api.isApiTrip(raw)) continue;
		const trip = raw;
		const route = routes.find((route) => route.id === trip.routeId);
		const userStop = trip.stopTimes.find((stop) => stop.stopId === userStopId);
		if (!route || !userStop) continue;
		const expectedTime = new Date(trip.oraArrivoEffettivaAFermataSelezionata);
		const endOfRoute = trip.stopTimes.at(-1)!;
		let isEndOfRouteForUser = endOfRoute.stopId === userStopId;
		if (isEndOfRouteForUser && trip.stopTimes[0].stopId === endOfRoute.stopId) {
			isEndOfRouteForUser =
				trip.lastSequenceDetection > 1 || formatTime(expectedTime) === endOfRoute.arrivalTime;
		}
		const stopTimes: StopTime[] = trip.stopTimes.map((stop) => ({
			name: getStopName(stop.stopId) || `Fermata ${stop.stopId}`,
			time: stop.arrivalTime.substring(0, 5),
		}));
		const id = trip.tripId + '-' + Date.parse(trip.oraArrivoProgrammataAFermataSelezionata);
		if (trips.some((item) => item.id === id)) continue;
		trips.push({
			id,
			routeName: route.name,
			routeColor: route.color,
			destination: trip.tripHeadsign,
			expectedAt: expectedTime.getTime(),
			lastLiveAt: trip.delay === null ? null : Date.parse(trip.lastEventRecivedAt),
			delay: trip.delay,
			// A live bus with no next stop is still completing its previous trip.
			currentStopSequenceNumber:
				trip.stopNext === 0 && trip.delay !== null ? -1 : trip.lastSequenceDetection,
			vehicleId:
				Number.isInteger(trip.matricolaBus) && trip.matricolaBus! >= 0
					? String(trip.matricolaBus)
					: null,
			userStopSequenceNumber: isEndOfRouteForUser ? endOfRoute.stopSequence : userStop.stopSequence,
			isEndOfRouteForUser,
			stopTimes,
		});
	}
	if (rawTrips.length && !trips.length) throw new Error('No valid bus trips in upstream response');
	const partial = trips.length !== rawTrips.length;
	if (partial) logger.warn('Skipped invalid or duplicate bus trips');
	// Provider can associate a bus with its next trip, producing wildly early arrivals.
	// Apply this after validation: intentionally hidden trips are valid empty results,
	// not malformed responses or missing data.
	const visibleTrips = trips.filter((trip) => {
		const distanceInStops = trip.userStopSequenceNumber - trip.currentStopSequenceNumber;
		const isFarAhead = distanceInStops < -2;
		const isEndOfLine = trip.currentStopSequenceNumber === trip.stopTimes.length;
		return !(trip.delay !== null && trip.delay < -5 && (isFarAhead || isEndOfLine));
	});
	return { trips: visibleTrips, partial };
}

function directionName(stop: Stop): string {
	if (stop.code.endsWith('z')) {
		return `» Periferia`;
	} else if (stop.code.endsWith('x')) {
		return `» Centro`;
	} else if (stop.code.endsWith('c')) {
		return 'Capolinea';
	} else if (stop.code.endsWith('s')) {
		return `Sud`;
	} else if (stop.code.endsWith('n')) {
		return `Nord`;
	} else if (stop.code.endsWith('o')) {
		return `Ovest`;
	} else if (stop.code.endsWith('e')) {
		return `Est`;
	} else {
		return '';
	}
}

function formatTime(date: Date) {
	// Output format should always be 15:00:00
	return date.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' });
}
