import type { Coordinates } from '$lib/Coordinates';
import type { StopGroup } from '$lib/StopGroup';
import type { Station } from '$lib/Station';

export function computeStopsDistances(
	stops: StopGroup[],
	userCoordinates: GeolocationCoordinates | null = null,
) {
	const distances = new Map<string, number>();

	// Default to Piazza Dante Trento
	if (!userCoordinates) {
		userCoordinates = { latitude: 46.071756, longitude: 11.119511 } as GeolocationCoordinates;
	}

	for (const stop of stops) {
		distances.set(stop.code, distance(userCoordinates, stop.coordinates));
	}

	return distances;
}

export function computeStationsDistances(
	stations: Station[],
	userCoordinates: GeolocationCoordinates,
) {
	const distances = new Map<string, number>();

	for (const station of stations) {
		distances.set(station.id, distance(userCoordinates, station.coordinates));
	}

	return distances;
}

export function distance(
	userCoordinates: GeolocationCoordinates | null,
	stopCoordinates: Coordinates,
) {
	if (userCoordinates == null) {
		return Infinity;
	}

	const radians = (degrees: number) => (degrees * Math.PI) / 180;
	const latitude = radians(stopCoordinates.latitude - userCoordinates.latitude);
	const longitude = radians(stopCoordinates.longitude - userCoordinates.longitude);
	const a =
		Math.sin(latitude / 2) ** 2 +
		Math.cos(radians(userCoordinates.latitude)) *
			Math.cos(radians(stopCoordinates.latitude)) *
			Math.sin(longitude / 2) ** 2;
	return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocation unavailable'));
			return;
		}
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			timeout: 10_000,
			maximumAge: 60_000,
		});
	});
}

export function handleGeolocationError(err: unknown) {
	if (typeof err === 'object' && err !== null && 'code' in err && err.code === 1) {
		alert(
			'La richiesta di accesso alla posizione è stata negata. Verifica le autorizzazioni al sito nelle impostazioni del tuo browser.',
		);
	} else {
		alert("Si è verificato un errore durante l'ottenimento della posizione");
	}
}

export async function isGeolocationGranted() {
	// Safari doesn't support permissions API, so we can't check if the permission was granted
	if (!navigator.permissions) {
		return false;
	}

	try {
		const permission = await navigator.permissions.query({ name: 'geolocation' });
		return permission.state === 'granted';
	} catch {
		return false;
	}
}
