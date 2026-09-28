import assert from 'node:assert/strict';
import { access, writeFile, readFile } from 'node:fs/promises';

assert.notEqual(process.getuid(), 0, 'Runtime must be non-root');
await assert.rejects(writeFile('/app/write-probe', 'test'), { code: 'EROFS' });
await assert.rejects(access('/app/node_modules/vite'));
await assert.rejects(access('/app/.env'));
const status = await readFile('/proc/self/status', 'utf8');
assert.match(status, /CapEff:\s+0+\n/);
assert.match(status, /NoNewPrivs:\s+1\n/);
for (const path of [
	'/healthz',
	'/',
	'/90001',
	'/treni/trentofs',
	'/api/stops/90001',
	'/api/stations/trentofs?arrivals=1',
	'/sitemap.xml',
]) {
	const response = await fetch(`http://127.0.0.1:3000${path}`, {
		headers: path === '/healthz' ? {} : { 'X-Forwarded-For': '192.0.2.1' },
		signal: AbortSignal.timeout(10000),
	});
	assert.equal(response.status, 200, path);
	const body = await response.text();
	if (path === '/healthz') assert.equal(JSON.parse(body).status, 'ok');
	if (path === '/sitemap.xml') assert.ok(body.includes('https://transport.example/90001'));
	assert.ok(!body.includes('gc.zgo.at'));
}
console.log(
	'Docker smoke passed: non-root, read-only, no capabilities, production dependencies, health and bus/train routes.',
);
