import type { Freshness } from '$lib/Freshness';

export interface CachedResource<T> extends Freshness {
	value: T;
}

/** Bounded process-local cache. Failed refreshes never advance fetchedAt. */
export class ResourceCache<T> {
	private entries = new Map<string, CachedResource<T>>();
	private pending = new Map<string, Promise<CachedResource<T>>>();
	private retryAt = new Map<string, number>();
	constructor(
		private freshMs: number,
		private maxAgeMs: number,
		private maxEntries = 500,
	) {}

	get(key: string, load: () => Promise<T>): Promise<CachedResource<T>> {
		const now = Date.now();
		const previous = this.entries.get(key);
		const age = previous ? now - previous.cachedAt.getTime() : Infinity;
		if (previous && age < this.freshMs) return Promise.resolve({ ...previous, stale: false });
		if (previous && age <= this.maxAgeMs && now < (this.retryAt.get(key) ?? 0)) {
			return Promise.resolve({ ...previous, stale: true });
		}
		const pending = this.pending.get(key);
		if (pending) return pending;
		const promise = Promise.resolve()
			.then(load)
			.then((value) => {
				const result = { value, cachedAt: new Date(), stale: false };
				this.entries.delete(key);
				this.entries.set(key, result);
				this.retryAt.delete(key);
				while (this.entries.size > this.maxEntries) {
					const oldest = this.entries.keys().next().value!;
					this.entries.delete(oldest);
					this.retryAt.delete(oldest);
				}
				return result;
			})
			.catch((error: unknown) => {
				if (previous && Date.now() - previous.cachedAt.getTime() <= this.maxAgeMs) {
					this.retryAt.set(key, Date.now() + 10_000);
					return { ...previous, stale: true };
				}
				this.entries.delete(key);
				this.retryAt.delete(key);
				throw error;
			})
			.finally(() => this.pending.delete(key));
		this.pending.set(key, promise);
		return promise;
	}
}

export const METADATA_FRESH_MS = 24 * 60 * 60 * 1000;
export const METADATA_MAX_AGE_MS = 7 * METADATA_FRESH_MS;
export const LIVE_FRESH_MS = 29_000;
export const LIVE_MAX_AGE_MS = 120_000;
