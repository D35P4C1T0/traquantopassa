<script lang="ts">
	import type { FavoriteStops } from '$lib/storage/favorites.svelte';
	import { getContext } from 'svelte';
	import starFilled from '$lib/assets/star-filled.svg';
	import star from '$lib/assets/star.svg';

	interface Props {
		stopCode: string;
		className?: string;
	}

	let { stopCode, className = '' }: Props = $props();

	const favorites: FavoriteStops = getContext('favorites');

	let isFavorite = $derived(favorites.value.includes(stopCode));
	let starElement: HTMLImageElement | undefined = $state();

	function toggleFavorite(event: Event) {
		event.preventDefault();
		if (!isFavorite) {
			favorites.addFavorite(stopCode);
			if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
				starElement?.classList.add('animate-spin-forward');
		} else {
			favorites.removeFavorite(stopCode);
			if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
				starElement?.classList.add('animate-spin-backward');
		}
	}
</script>

<button
	type="button"
	class={className}
	onclick={toggleFavorite}
	aria-pressed={isFavorite}
	aria-label={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
>
	<img
		onanimationend={() =>
			starElement?.classList.remove('animate-spin-forward', 'animate-spin-backward')}
		src={isFavorite ? starFilled : star}
		alt=""
		class="size-6"
		bind:this={starElement}
	/>
</button>
