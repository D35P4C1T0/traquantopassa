import { env } from '$env/dynamic/private';
import * as logger from '$lib/logger';
import { elapsed } from '$lib/server/time-helpers';
import { httpOrigin } from './deployment';
import { fetchChecked, isRecord, finite, text, validDate, arrayOf } from './upstream';

function credentials() {
	if (!env.API_BASE_URL) throw new Error('Missing API_BASE_URL environment variable');
	const username = env.API_USERNAME || 'mittmobile';
	const password = env.API_PASSWORD || 'ecGsp.RHB3';
	return {
		base: httpOrigin(env.API_BASE_URL!, 'API_BASE_URL'),
		authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
	};
}

export interface ApiStop {
	stopId: number;
	stopName: string;
	town: string | null;
	stopCode: string;
	stopLat: number;
	stopLon: number;
	routes: { routeId: number }[];
}

export interface ApiRoute {
	routeId: number;
	routeShortName: string;
	routeLongName: string;
	routeColor: string | null;
}

export interface ApiTrip {
	tripId: string;
	routeId: number;
	oraArrivoEffettivaAFermataSelezionata: string;
	oraArrivoProgrammataAFermataSelezionata: string;
	stopNext: number | null;
	matricolaBus?: number | null;
	lastSequenceDetection: number;
	delay: number | null;
	lastEventRecivedAt: string;
	tripHeadsign: string;
	stopTimes: ApiStopTime[];
}

export interface ApiStopTime {
	stopId: number;
	stopSequence: number;
	arrivalTime: string;
}

function filterStops(apiStops: ApiStop[]) {
	return apiStops.filter(
		(stop) =>
			// Check the stopcode format to avoid stuff like Funivia Trento-Sardagna
			/^[0-9]+[a-z-]*$/.test(stop.stopCode) &&
			// Ensure the stop has routes and it's not disuesed
			stop.routes.length > 0 &&
			(stop.town === 'Trento' ||
				stop.town === 'Lavis' ||
				// Some stops in Trento are not tagged with a town, so we use a
				// box check to ensure they are in Trento or lavis
				(stop.town === null &&
					stop.stopLat > 46 &&
					stop.stopLon > 11.04 &&
					stop.stopLat < 46.1815 &&
					stop.stopLon < 11.2)),
	);
}

export async function getStops() {
	const path = '/gtlservice/stops?type=U';

	logger.info('Fetching stops from API');
	const start = performance.now();

	const config = credentials();
	const res = await fetchChecked(config.base + path, {
		headers: {
			Authorization: config.authorization,
		},
		signal: AbortSignal.timeout(10 * 1000),
	});

	const raw: unknown = await res.json();
	if (!Array.isArray(raw)) throw new Error('Invalid stops payload');
	// Disused stops may omit routes; normalize them before validating metadata.
	const data = arrayOf(
		raw.map((stop: unknown) =>
			isRecord(stop) && stop.routes == null ? { ...stop, routes: [] } : stop,
		),
		isApiStop,
	);

	logger.info(`Fetched stops in ${elapsed(start)} ms`);

	return filterStops(data);
}

export async function getRoutes() {
	const path = '/gtlservice/routes?areas=23';

	logger.info('Fetching routes from API');
	const start = performance.now();

	const config = credentials();
	const res = await fetchChecked(config.base + path, {
		headers: {
			Authorization: config.authorization,
		},
		signal: AbortSignal.timeout(10 * 1000),
	});

	const data = arrayOf(await res.json(), isApiRoute);

	logger.info(`Fetched routes in ${elapsed(start)} ms`);

	return data;
}

export async function getTrips(stopId: number, limit: number) {
	const path = `/gtlservice/trips_new?limit=${limit}&stopId=${stopId}&type=U`;

	logger.info(`Fetching trips for ${stopId}`);
	const start = performance.now();

	const config = credentials();
	const res = await fetchChecked(config.base + path, {
		headers: {
			Authorization: config.authorization,
		},
		signal: AbortSignal.timeout(6 * 1000),
	});

	const data: unknown = await res.json();
	if (!Array.isArray(data)) throw new Error('Invalid trips payload');

	logger.info(`Fetched trips for ${stopId} in ${elapsed(start)} ms`);

	return data;
}

export function isApiStop(value: unknown): value is ApiStop {
	return (
		isRecord(value) &&
		finite(value.stopId) &&
		text(value.stopName) &&
		(value.town === null || text(value.town)) &&
		text(value.stopCode) &&
		finite(value.stopLat) &&
		Math.abs(value.stopLat) <= 90 &&
		finite(value.stopLon) &&
		Math.abs(value.stopLon) <= 180 &&
		Array.isArray(value.routes) &&
		value.routes.every((route) => isRecord(route) && finite(route.routeId))
	);
}
export function isApiRoute(value: unknown): value is ApiRoute {
	return (
		isRecord(value) &&
		finite(value.routeId) &&
		text(value.routeShortName) &&
		text(value.routeLongName) &&
		(value.routeColor === null ||
			value.routeColor === '' ||
			(text(value.routeColor) && /^[a-f0-9]{6}$/i.test(value.routeColor)))
	);
}
export function isApiTrip(value: unknown): value is ApiTrip {
	return (
		isRecord(value) &&
		text(value.tripId) &&
		finite(value.routeId) &&
		validDate(value.oraArrivoEffettivaAFermataSelezionata) &&
		validDate(value.oraArrivoProgrammataAFermataSelezionata) &&
		finite(value.lastSequenceDetection) &&
		Number.isInteger(value.lastSequenceDetection) &&
		value.lastSequenceDetection >= 0 &&
		(value.delay === null || finite(value.delay)) &&
		(value.delay === null || validDate(value.lastEventRecivedAt)) &&
		text(value.tripHeadsign) &&
		Array.isArray(value.stopTimes) &&
		value.stopTimes.length > 0 &&
		value.stopTimes.every(
			(stop) =>
				isRecord(stop) &&
				finite(stop.stopId) &&
				finite(stop.stopSequence) &&
				Number.isInteger(stop.stopSequence) &&
				stop.stopSequence > 0 &&
				text(stop.arrivalTime) &&
				/^\d{2}:\d{2}:\d{2}$/.test(stop.arrivalTime),
		)
	);
}
