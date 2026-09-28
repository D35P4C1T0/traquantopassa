import { env } from '$env/dynamic/private';
import { ResourceCache } from './resource-cache';
import { httpOrigin } from './deployment';
import { fetchChecked, isRecord, text, finite } from './upstream';
import stopsRankingFallback from '$lib/server/stops-ranking-fallback';
import * as logger from '$lib/logger';
import type { StopGroup } from '$lib/StopGroup';
import { elapsed } from '$lib/server/time-helpers';

// Cache both successful rankings and fallback for five minutes.
const cache = new ResourceCache<Record<string, number>>(300_000, 300_000, 1);
export async function getRankings(stops: StopGroup[]) {
	if (!env.GOATCOUNTER_API_KEY || !env.GOATCOUNTER_URL) return stopsRankingFallback;
	return (
		await cache.get('rankings', async () => {
			try {
				return await loadMostVisitedStops(stops);
			} catch (error) {
				logger.error('Error while fetching most visited stops', error);
				return stopsRankingFallback;
			}
		})
	).value;
}

async function loadMostVisitedStops(stops: StopGroup[]): Promise<Record<string, number>> {
	// Fetch most visited stops in the last month
	const start = new Date();
	start.setDate(start.getDate() - 30);

	const url =
		httpOrigin(env.GOATCOUNTER_URL!, 'GOATCOUNTER_URL') +
		'/api/v0/stats/hits?start=' +
		encodeURIComponent(start.toISOString());

	logger.info('Fetching stops ranking from API');
	const startTs = performance.now();

	const response = await fetchChecked(url, {
		headers: {
			Authorization: 'Bearer ' + env.GOATCOUNTER_API_KEY,
		},
		signal: AbortSignal.timeout(3 * 1000),
	});

	const data: unknown = await response.json();
	if (!isRecord(data) || !Array.isArray(data.hits)) throw new Error('Invalid rankings');

	logger.info(`Fetched stops ranking in ${elapsed(startTs)} ms`);

	const rankings: Record<string, number> = {};

	for (const hit of data.hits) {
		if (!isRecord(hit) || !text(hit.path) || !finite(hit.count))
			throw new Error('Invalid ranking entry');
		// Extract slug from URL
		const match = hit.path.match(/^\/\w+/);
		if (match) {
			const slug = match[0].slice(1);
			// See if a stop with that slug exists
			const stop = stops.find((x) => x.slugs.includes(slug));
			if (stop) {
				// Sum or save the total hits count
				const code = stop.code;
				if (rankings[code]) {
					rankings[code] += hit.count;
				} else {
					rankings[code] = hit.count;
				}
			}
		}
	}

	return rankings;
}
