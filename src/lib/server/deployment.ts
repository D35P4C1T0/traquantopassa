import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function httpOrigin(value: string, name: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`Invalid ${name}: expected HTTP(S) origin`);
	}
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.pathname !== '/' ||
		url.search ||
		url.hash
	) {
		throw new Error(`Invalid ${name}: expected HTTP(S) origin`);
	}
	return url.origin;
}

export function deployment(requestUrl: URL) {
	return {
		baseUrl: publicEnv.PUBLIC_BASE_URL
			? httpOrigin(publicEnv.PUBLIC_BASE_URL, 'PUBLIC_BASE_URL')
			: requestUrl.origin,
		analyticsUrl: env.GOATCOUNTER_URL ? httpOrigin(env.GOATCOUNTER_URL, 'GOATCOUNTER_URL') : null,
	};
}
