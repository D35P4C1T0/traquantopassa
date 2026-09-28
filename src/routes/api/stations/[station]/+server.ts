import { json } from '@sveltejs/kit';
import { getStationBoard } from '$lib/server/station-board-service';
export async function GET({ params, url }) {
	return json(
		await getStationBoard(
			params.station,
			url.searchParams.get('arrivals') === '1' ? 'arrivi' : undefined,
		),
		{ headers: { 'Cache-Control': 'no-store' } },
	);
}
