import { getStationBoard } from '$lib/server/station-board-service';
export function load({ params }) {
	return getStationBoard(params.station, params.departures);
}
