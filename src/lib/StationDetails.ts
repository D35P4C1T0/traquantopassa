import type { Train } from '$lib/Train';

export default interface StationDetails {
	id: string;
	name: string;
	canonicalSlug: string;
	lastUpdatedAt: Date;
	stale: boolean;
	partial?: boolean;
	metadataStale?: boolean;
	trains: Train[];
	isDeparture: boolean;
	stopSlug: string | null;
}
