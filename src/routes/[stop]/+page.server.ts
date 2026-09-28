import { getStopBoard } from '$lib/server/stop-board-service';
export function load({ params }) {
	return getStopBoard(params.stop);
}
