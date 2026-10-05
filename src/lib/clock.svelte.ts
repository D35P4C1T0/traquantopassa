import { onMount } from 'svelte';

export interface TimeState {
	now: number;
}

/** One clock per board. Pause in hidden tabs and catch up when visible again. */
export function createBoardClock(): TimeState {
	const clock = $state({ now: Date.now() });
	onMount(() => {
		let timer: ReturnType<typeof setInterval> | undefined;
		function sync() {
			clearInterval(timer);
			if (document.visibilityState !== 'hidden') {
				clock.now = Date.now();
				timer = setInterval(() => (clock.now = Date.now()), 5_000);
			}
		}
		sync();
		document.addEventListener('visibilitychange', sync);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', sync);
		};
	});
	return clock;
}

export function timeAgo(timestamp: number, now: number, justNow = 'proprio ora'): string {
	const seconds = Math.max(0, Math.floor((now - timestamp) / 5_000) * 5);
	if (seconds === 0) return justNow;
	if (seconds < 60) return `${seconds} secondi fa`;
	const minutes = Math.floor(seconds / 60);
	return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
}
