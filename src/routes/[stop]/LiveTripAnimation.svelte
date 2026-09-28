<script lang="ts">
	interface Props {
		live: 'green' | 'yellow' | null;
		className?: string;
	}

	let { live, className = '' }: Props = $props();

	let el: HTMLSpanElement;

	function syncAnimation() {
		el.getAnimations().forEach((a) => (a.startTime = 0));
	}

	$effect(() => {
		syncAnimation();
	});
</script>

<span
	role="img"
	aria-label={live === 'green'
		? 'Dati in tempo reale'
		: live === 'yellow'
			? 'Dati non aggiornati'
			: 'Orario programmato'}
	bind:this={el}
	onanimationstart={syncAnimation}
	class="h-2 w-2 rounded-full {className}"
	class:bg-green-500={live === 'green'}
	class:bg-yellow-500={live === 'yellow'}
	class:animate-ping={live != null}
></span>
