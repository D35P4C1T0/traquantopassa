export interface Trip {
	id: string;
	routeName: string;
	routeColor: string;
	destination: string;
	minutes: number;
	vehicleId: string | null;
	lastUpdatedTimestamp: number | null;
	delay: number | null;
	currentStopSequenceNumber: number;
	userStopSequenceNumber: number;
	isOutdated: boolean;
	isEndOfRouteForUser: boolean;
	stopTimes: StopTime[];
}

export interface StopTime {
	name: string;
	time: string;
}

export interface ExpandedTripState {
	id: string | null;
}
