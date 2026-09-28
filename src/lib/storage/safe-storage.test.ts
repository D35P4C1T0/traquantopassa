import { afterEach, expect, it, vi } from 'vitest';
import { readStored, stringArray, writeStored, readTab } from './safe-storage';
afterEach(() => vi.unstubAllGlobals());
it('rejects invalid JSON and unexpected shapes', () => {
	const getItem = vi.fn();
	vi.stubGlobal('localStorage', { getItem });
	for (const value of ['{broken', '{}', '[1]', 'null']) {
		getItem.mockReturnValue(value);
		expect(readStored('x', [], stringArray)).toEqual([]);
	}
	getItem.mockReturnValue('["1"]');
	expect(readStored('x', [], stringArray)).toEqual(['1']);
	getItem.mockReturnValue('bad');
	expect(readTab('x', ['all', 'favorites'], 'all')).toBe('all');
});
it('storage exceptions preserve fallback and do not throw on writes', () => {
	vi.stubGlobal('localStorage', {
		getItem: () => {
			throw new Error('blocked');
		},
		setItem: () => {
			throw new Error('full');
		},
	});
	expect(readStored('x', [], stringArray)).toEqual([]);
	expect(() => writeStored('x', [])).not.toThrow();
});
