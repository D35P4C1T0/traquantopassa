import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { startTestServer } from './test-server.mjs';
const port = 4174;
const server = startTestServer(port);
const base = `http://127.0.0.1:${port}`;
try {
	let ready = false;
	for (let attempt = 0; attempt < 100; attempt++) {
		if (server.exitCode !== null) throw new Error('Server exited before becoming ready');
		try {
			if ((await fetch(`${base}/healthz`)).ok) {
				ready = true;
				break;
			}
		} catch {
			/* Starting. */
		}
		await delay(100);
	}
	assert.ok(ready, 'Server ready within ten seconds');
	for (const path of [
		'/',
		'/90001',
		'/treni',
		'/treni/trentofs',
		'/treni/trentofs/arrivi',
		'/api/stops/90001',
		'/api/stations/trentofs?arrivals=1',
		'/sitemap.xml',
	]) {
		const response = await fetch(base + path);
		assert.equal(response.status, 200, path);
		const body = await response.text();
		assert.ok(!body.includes('gc.zgo.at'), 'No analytics script when disabled');
		if (path === '/90001' || path === '/sitemap.xml')
			assert.ok(body.includes('https://transport.example/90001'), 'Runtime public URL');
	}
	assert.equal((await fetch(base + '/treni/trentofs/invalid')).status, 404);
	console.log(
		'Production smoke passed: bus/train routes, health, sitemap, runtime URL, analytics disabled.',
	);
} finally {
	if (server.exitCode === null) {
		const exited = once(server, 'exit');
		server.kill('SIGTERM');
		await exited;
	}
}
