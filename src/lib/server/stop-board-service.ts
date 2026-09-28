import * as stopsService from '$lib/server/stops-service';
import * as tripsService from '$lib/server/trips-service';
import { error } from '@sveltejs/kit';
import type StopGroupDetails from '$lib/StopGroupDetails';
import { getStationForStop } from '$lib/server/stops-stations-mapping';
import type { StopDirection } from '$lib/StopDirection';
import * as logger from '$lib/logger';

export async function getStopBoard(slug: string) {
	let stopGroups;
	try {
		stopGroups = await stopsService.getStopGroupsResource();
	} catch (e) {
		logger.error('Error fetching stop metadata', e);
		error(503);
	}
	const stopGroup = stopGroups.value.find((group) => group.slugs.includes(slug));
	if (!stopGroup) {
		error(404);
	}

	const directions: StopDirection[] = [];
	let cacheTime;
	let stale = false;
	let partial = false;
	let metadataStale = stopGroups.stale;

	try {
		// Gather results for all directions in parallel
		const promises = stopGroup.stops.map((s) => tripsService.getTrips(s));
		const results = await Promise.all(promises);
		for (const direction of results) {
			directions.push(direction.value);
		}
		cacheTime = new Date(Math.min(...results.map((result) => result.cachedAt.getTime())));
		stale = results.some((result) => result.stale);
		partial = results.some((result) => result.partial);
		metadataStale ||= results.some((result) => result.metadataStale);
	} catch (e) {
		logger.error(`Error while fetching trips for stop ${stopGroup.slugs[0]}:`, e);
		error(503);
	}

	// Sort by name
	directions.sort((a, b) => a.name.localeCompare(b.name));

	return {
		details: {
			name: stopGroup.name,
			code: stopGroup.code,
			canonicalSlug: stopGroup.slugs[0],
			lastUpdatedAt: cacheTime,
			stale,
			partial,
			metadataStale,
			directions,
			trainStationSlug: getStationForStop(stopGroup.slugs[0]),
		} satisfies StopGroupDetails as StopGroupDetails, // TODO: ???
	};
}
