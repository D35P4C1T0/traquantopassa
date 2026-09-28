export async function fetchChecked(url: string | URL, init: RequestInit = {}): Promise<Response> {
	const response = await fetch(url, {
		...init,
		signal: init.signal ?? AbortSignal.timeout(15_000),
	});
	if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
	return response;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function finite(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}
export function text(value: unknown): value is string {
	return typeof value === 'string';
}
export function validDate(value: unknown): value is string {
	return text(value) && Number.isFinite(Date.parse(value));
}
export function arrayOf<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
	if (!Array.isArray(value) || !value.every(guard)) throw new Error('Invalid upstream payload');
	return value;
}
