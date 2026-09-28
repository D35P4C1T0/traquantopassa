import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/** Read explicitly mounted secrets before SvelteKit captures runtime environment. */
export async function loadSecrets(environment = process.env) {
	for (const name of ['API_USERNAME', 'API_PASSWORD', 'GOATCOUNTER_API_KEY']) {
		const file = environment[`${name}_FILE`];
		if (!file) continue;
		if (environment[name]) throw new Error(`Set either ${name} or ${name}_FILE, not both`);
		let value;
		try {
			value = await readFile(file, 'utf8');
		} catch {
			throw new Error(`Cannot read ${name}_FILE`);
		}
		// Strip a conventional final newline without changing spaces in passwords.
		value = value.replace(/\r?\n$/, '');
		if (!value || /[\r\n\0]/.test(value))
			throw new Error(`Invalid ${name}_FILE: expected one nonempty line`);
		environment[name] = value;
		delete environment[`${name}_FILE`];
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		await loadSecrets();
		await import('../build/index.js');
	} catch (error) {
		console.error(error instanceof Error ? error.message : 'Container startup failed');
		process.exitCode = 1;
	}
}
