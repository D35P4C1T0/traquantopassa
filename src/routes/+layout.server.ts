import { deployment } from '$lib/server/deployment';

export function load({ url }) {
	return deployment(url);
}
