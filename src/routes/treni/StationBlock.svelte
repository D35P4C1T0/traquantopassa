<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Station } from '$lib/Station';
	import StationFavoriteButton from '$lib/components/StationFavoriteButton.svelte';

	interface Props {
		station: Station;
	}

	let { station }: Props = $props();
</script>

<div class="relative w-full">
	<a
		href={resolve('/treni/[station]', { station: station.slug })}
		class="flex w-full flex-col justify-between rounded-lg bg-neutral-800 pt-3 pr-12 pb-4 pl-4 no-underline"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex flex-col gap-1">
				<span class="leading-snug">{station.name}</span>
				<span class="text-sm text-neutral-500 no-underline">
					/{station.slug}
				</span>
			</div>
		</div>

		<div class="mt-2 flex flex-col text-xs font-semibold text-neutral-500">
			{#each station.railways as railway (railway)}
				<span>{railway}</span>
			{/each}
		</div>
	</a>

	<StationFavoriteButton stationId={station.id} className="absolute right-3 top-3 p-1" />
</div>
