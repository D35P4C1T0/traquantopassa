import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSecrets } from './entrypoint.mjs';

test('mounted secrets preserve password spaces and omit file paths afterward', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'tqp-secrets-'));
	try {
		const file = join(directory, 'password');
		await writeFile(file, ' password with spaces \n');
		/** @type {NodeJS.ProcessEnv} */
		const env = { API_PASSWORD_FILE: file };
		await loadSecrets(env);
		assert.equal(env.API_PASSWORD, ' password with spaces ');
		assert.equal(env.API_PASSWORD_FILE, undefined);
	} finally {
		await rm(directory, { recursive: true });
	}
});

test('conflicting, missing and invalid secrets fail without exposing their values', async () => {
	await assert.rejects(
		loadSecrets({ API_PASSWORD: 'private', API_PASSWORD_FILE: '/missing' }),
		/Set either/,
	);
	await assert.rejects(loadSecrets({ API_PASSWORD_FILE: '/missing' }), {
		message: 'Cannot read API_PASSWORD_FILE',
	});
	const directory = await mkdtemp(join(tmpdir(), 'tqp-secrets-'));
	try {
		const file = join(directory, 'password');
		await writeFile(file, 'private\nsecond-line');
		await assert.rejects(loadSecrets({ API_PASSWORD_FILE: file }), {
			message: 'Invalid API_PASSWORD_FILE: expected one nonempty line',
		});
	} finally {
		await rm(directory, { recursive: true });
	}
});
