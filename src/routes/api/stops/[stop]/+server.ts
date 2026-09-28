import { json } from '@sveltejs/kit';
import { getStopBoard } from '$lib/server/stop-board-service';
export async function GET({ params }) {
	return json(await getStopBoard(params.stop), { headers: { 'Cache-Control': 'no-store' } });
}
