import { ResourceCache, METADATA_FRESH_MS, METADATA_MAX_AGE_MS } from './resource-cache';
import type { Route } from '$lib/Route';
import * as api from '$lib/server/trentino-trasporti-api';
import type { ApiRoute } from '$lib/server/trentino-trasporti-api';
import * as logger from '$lib/logger';

const cache = new ResourceCache<Route[]>(METADATA_FRESH_MS, METADATA_MAX_AGE_MS, 1);

export function getRoutesResource() {
	return cache.get('routes', async () => {
		logger.info('Fetching routes from API');
		const routes = (await api.getRoutes()).map(apiRouteToRoute);
		return routes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
	});
}
export async function getRoutes() {
	return (await getRoutesResource()).value;
}

function mapRouteColor(apiRoute: ApiRoute) {
	if (apiRoute.routeShortName == '5/' || apiRoute.routeShortName == 'CM') {
		return '#F5C500';
	} else if (apiRoute.routeShortName == '18') {
		return '#8ea24c';
	} else if (apiRoute.routeShortName == 'G') {
		return '#542774';
	} else if (apiRoute.routeShortName == 'M') {
		return '#074E3C';
	} else if (apiRoute.routeShortName == 'L1') {
		return '#f5c500';
	} else if (apiRoute.routeShortName == 'L2') {
		return '#da9694';
	} else if (apiRoute.routeShortName == 'L3') {
		return '#92d050';
	} else if (apiRoute.routeShortName == 'L4') {
		return '#95b3d7';
	}

	if (!apiRoute.routeColor) {
		return '#1f1a17';
	}

	return '#' + apiRoute.routeColor;
}

function apiRouteToRoute(apiRoute: api.ApiRoute): Route {
	return {
		id: apiRoute.routeId,
		name: apiRoute.routeShortName,
		longName: apiRoute.routeLongName,
		color: mapRouteColor(apiRoute),
	};
}
