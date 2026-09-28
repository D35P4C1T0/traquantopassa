import * as stopsService from '$lib/server/stops-service';
import * as routesService from '$lib/server/routes-service';
import * as stopsRankingService from '$lib/server/stops-ranking-service';
import { error } from '@sveltejs/kit';
import * as logger from '$lib/logger';

export async function load() {
	let stops, routes, rankings;
	let metadataStale = false;
	try {
		const [stopResult, routeResult] = await Promise.all([
			stopsService.getStopGroupsResource(),
			routesService.getRoutesResource(),
		]);
		stops = stopResult.value;
		routes = routeResult.value;
		metadataStale = stopResult.stale || routeResult.stale;
		rankings = await stopsRankingService.getRankings(stops);
	} catch (e) {
		logger.error('Error while fetching stops/routes', e);
		error(503);
	}

	return {
		stops,
		routes,
		rankings,
		metadataStale,
	};
}
