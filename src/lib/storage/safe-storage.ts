export function readStored<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
	try {
		const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
		return valid(value) ? value : fallback;
	} catch {
		return fallback;
	}
}
export function writeStored(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* Preferences remain in memory. */
	}
}
export function readTab<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
	try {
		const value = localStorage.getItem(key);
		return allowed.includes(value as T) ? (value as T) : fallback;
	} catch {
		return fallback;
	}
}
export function writeTab(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* Preferences remain in memory. */
	}
}
export function stringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
