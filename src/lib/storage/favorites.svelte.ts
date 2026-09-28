import { browser } from '$app/environment';
import { readStored, writeStored, stringArray } from './safe-storage';

class Favorites {
	value = $state<string[]>([]);
	private initialized = $state(false);
	constructor(key: string) {
		if (browser) {
			$effect(() => {
				if (!this.initialized) {
					this.value = [...new Set(readStored(key, [], stringArray))];
					this.initialized = true;
				}
			});
			$effect(() => {
				if (this.initialized) writeStored(key, this.value);
			});
		}
	}
	addFavorite = (id: string) => {
		if (!this.value.includes(id)) this.value.push(id);
	};
	removeFavorite = (id: string) => {
		this.value = this.value.filter((value) => value !== id);
	};
}
export class FavoriteStops extends Favorites {}
export class FavoriteStations extends Favorites {}
export function favoriteStopsStore() {
	return new FavoriteStops('tqp_stops_favorites');
}
export function favoriteStationsStore() {
	return new FavoriteStations('tqp_stations_favorites');
}
