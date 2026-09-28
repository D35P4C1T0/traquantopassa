import { readTab, writeTab } from './safe-storage';
import { browser } from '$app/environment';

const LOCAL_STORAGE_KEY = 'tqp_stations_default_tab';

export type Tab = 'all' | 'filter' | 'favorites';

export function getDefaultTab(): Tab {
	if (!browser) {
		return 'all';
	}

	return readTab<Tab>(LOCAL_STORAGE_KEY, ['all', 'filter', 'favorites'], 'all');
}

export function setDefaultTab(tab: Tab) {
	writeTab(LOCAL_STORAGE_KEY, tab);
}
