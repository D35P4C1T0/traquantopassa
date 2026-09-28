import stationsList from '$lib/server/stations-list';
import type { Station } from '$lib/Station';
import { getIdFromSlug, getStations } from './rfi-api';

interface LazyStation extends Omit<Station, 'id'> {
	id: string | null;
}

import { ResourceCache, METADATA_FRESH_MS, METADATA_MAX_AGE_MS } from './resource-cache';
const curated = new Map(stationsList.map((station) => [station.slug, station]));
const catalogCache = new ResourceCache<Map<string, LazyStation>>(
	METADATA_FRESH_MS,
	METADATA_MAX_AGE_MS,
	1,
);
const idCache = new ResourceCache<string | null>(60_000, 60_000);

async function getStationMap() {
	return (
		await catalogCache.get('catalog', async () => {
			const stations = await getStations();
			return new Map(
				stations.map((station) => [
					station.slug,
					{
						id: null,
						slug: station.slug,
						name: station.name,
						coordinates: station.coordinates,
						railways: [],
					} satisfies LazyStation,
				]),
			);
		})
	).value;
}

export function getStationList() {
	return stationsList;
}

export function getRailways() {
	const railways = new Set<string>();
	for (const station of stationsList) {
		for (const railway of station.railways) {
			railways.add(railway);
		}
	}
	return Array.from(railways);
}

export async function getStationBySlug(slug: string): Promise<Station | null> {
	const known = curated.get(slug);
	if (known) return known;
	if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
	const station = (await getStationMap()).get(slug);
	if (!station) return null;
	const result = await idCache.get(slug, () => getIdFromSlug(slug));
	return result.value === null ? null : { ...station, id: result.value };
}
