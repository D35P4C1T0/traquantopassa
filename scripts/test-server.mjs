import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function startTestServer(port = 4173) {
	return spawn(process.execPath, ['--import', './tests/mock-upstream.mjs', 'build/index.js'], {
		cwd: fileURLToPath(new URL('..', import.meta.url)),
		stdio: 'inherit',
		env: {
			...process.env,
			HOST: '127.0.0.1',
			PORT: String(port),
			ORIGIN: `http://127.0.0.1:${port}`,
			PUBLIC_BASE_URL: 'https://transport.example',
			API_BASE_URL: 'https://bus.test',
			API_USERNAME: 'fixture',
			API_PASSWORD: 'fixture',
			GOATCOUNTER_API_KEY: '',
			GOATCOUNTER_URL: '',
			ADDRESS_HEADER: '',
			XFF_DEPTH: '',
			NODE_OPTIONS: '',
		},
	});
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const child = startTestServer(Number(process.env.PORT || 4173));
	for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
	child.on('exit', (code) => process.exit(code ?? 0));
}
