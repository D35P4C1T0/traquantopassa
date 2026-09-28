/** Schedule only after completion; hidden tabs neither poll nor overlap requests. */
export function startRefresh(
	refresh: () => Promise<unknown>,
	onError: (failed: boolean) => void,
	interval = 30_000,
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let stopped = false;
	let running = false;
	const visible = () => document.visibilityState !== 'hidden';
	function schedule() {
		clearTimeout(timer);
		if (!stopped && visible()) timer = setTimeout(run, interval);
	}
	async function run() {
		if (stopped || running || !visible()) return;
		running = true;
		try {
			await refresh();
			if (!stopped) onError(false);
		} catch {
			if (!stopped) onError(true);
		} finally {
			running = false;
			schedule();
		}
	}
	function visibilityChanged() {
		clearTimeout(timer);
		if (visible()) void run();
	}
	document.addEventListener('visibilitychange', visibilityChanged);
	schedule();
	return () => {
		stopped = true;
		clearTimeout(timer);
		document.removeEventListener('visibilitychange', visibilityChanged);
	};
}

export async function fetchBoard<T extends { lastUpdatedAt: Date }>(url: string): Promise<T> {
	const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
	if (!response.ok) throw new Error(`Board HTTP ${response.status}`);
	const body = await response.json();
	const lastUpdatedAt = new Date(body?.details?.lastUpdatedAt);
	if (!body?.details || !Number.isFinite(lastUpdatedAt.getTime()))
		throw new Error('Invalid board response');
	return { ...body.details, lastUpdatedAt };
}
