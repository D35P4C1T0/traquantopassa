// Loaded only by test subprocesses via --import. Never imported by application code.
import { readFileSync } from 'node:fs';
const bus = JSON.parse(readFileSync(new URL('./fixtures/bus.json', import.meta.url), 'utf8'));
const rfi = readFileSync(new URL('./fixtures/rfi.html', import.meta.url), 'utf8');
globalThis.fetch = async (input) => {
	const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
	if (url.origin === 'https://bus.test') {
		if (url.pathname.endsWith('/stops')) return Response.json(bus.stops);
		if (url.pathname.endsWith('/routes')) return Response.json(bus.routes);
		if (url.pathname.endsWith('/trips_new')) {
			return Response.json(
				bus.trips.map((trip) => ({
					...trip,
					oraArrivoEffettivaAFermataSelezionata: new Date(Date.now() + 600_000).toISOString(),
					oraArrivoProgrammataAFermataSelezionata: new Date(Date.now() + 480_000).toISOString(),
					lastEventRecivedAt: new Date().toISOString(),
				})),
			);
		}
	}
	if (url.hostname === 'iechub.rfi.it') return new Response(rfi);
	throw new Error(`Unexpected external request in test: ${url.origin}${url.pathname}`);
};
