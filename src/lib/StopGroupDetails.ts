import type { StopDirection } from '$lib/StopDirection';

export default interface StopGroupDetails {
	name: string;
	code: string;
	canonicalSlug: string;
	lastUpdatedAt: Date;
	stale: boolean;
	partial?: boolean;
	metadataStale?: boolean;
	directions: StopDirection[];
	trainStationSlug: string | null;
}
