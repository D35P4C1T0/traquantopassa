<script lang="ts">
	import { startRefresh } from '$lib/refresh';
	import DataStatus from '$lib/components/DataStatus.svelte';
	import Direction from './Direction.svelte';
	import { createBoardClock, timeAgo } from '$lib/clock.svelte';
	import FooterNavigation from '$lib/components/FooterNavigation.svelte';
	import { onMount, setContext } from 'svelte';
	import { resolve } from '$app/paths';
	import { fetchBoard } from '$lib/refresh';
	import type StopGroupDetails from '$lib/StopGroupDetails';
	import ModesSwitch from '$lib/components/ModesSwitch.svelte';
	import LiveTripAnimation from './LiveTripAnimation.svelte';
	import StopFavoriteButton from '$lib/components/StopFavoriteButton.svelte';
	import { Flag } from '@lucide/svelte';
	import type { ExpandedTripState } from '$lib/Trip';

	let { data } = $props();

	let live = $state<StopGroupDetails | null>(null);
	let details = $derived(live ?? data.details);
	$effect(() => {
		if (data.details) {
			live = null;
			refreshFailed = false;
		}
	});
	const clock = createBoardClock();
	setContext('timeState', clock);

	const tripState: ExpandedTripState = {
		id: null,
	};
	const expandedTrip = $state(tripState);
	setContext('expandedTrip', expandedTrip);

	let refreshFailed = $state(false);

	onMount(() =>
		startRefresh(
			async () => {
				const source = data.details;
				const next = await fetchBoard<StopGroupDetails>(
					resolve('/api/stops/[stop]', { stop: source.canonicalSlug }),
				);
				if (source === data.details) live = next;
			},
			(failed) => (refreshFailed = failed),
		),
	);
</script>

<svelte:head>
	<title>{details.name}</title>
	<link rel="canonical" href="{data.baseUrl}/{details.canonicalSlug}" />
</svelte:head>

<header>
	<div class="text-center">
		<h1 class="inline text-center text-4xl font-semibold">
			{details.name}
		</h1>
		<StopFavoriteButton stopCode={details.code} className="pl-2" />
	</div>
	<div class="mt-1 text-center text-sm">
		aggiornato {timeAgo(new Date(details.lastUpdatedAt).getTime(), clock.now)}
	</div>

	{#if details.trainStationSlug}
		<div class="mt-6 flex justify-center">
			<ModesSwitch
				isBus={true}
				stopSlug={details.canonicalSlug}
				stationSlug={details.trainStationSlug}
			/>
		</div>
	{/if}
</header>

<DataStatus
	cachedAt={details.lastUpdatedAt}
	stale={details.stale}
	partial={details.partial}
	metadataStale={details.metadataStale}
	failed={refreshFailed}
>
	<main>
		{#each details.directions as direction, i (`${details.code}-${i}`)}
			<Direction
				{direction}
				alone={details.directions.length < 2}
				stale={details.stale || refreshFailed}
			/>
		{/each}
	</main>
</DataStatus>

<footer class="my-12">
	<div class="space-y-2 text-sm text-neutral-500">
		<p>
			Il pallino verde
			<LiveTripAnimation className="inline-block mx-1" live="green" />
			indica che i dati sono in tempo reale.
		</p>

		<p>
			Il pallino è giallo
			<LiveTripAnimation className="inline-block mx-1" live="yellow" />
			se l'autobus non ha trasmesso aggiornamenti negli ultimi 5 minuti o se non è stato possibile aggiornare
			la pagina.
		</p>

		<p>
			Il simbolo
			<Flag class="inline size-4" />
			indica che la corsa terminerà a questa fermata.
		</p>

		<p>La pagina si aggiorna automaticamente ogni 30 secondi.</p>
	</div>

	<FooterNavigation className="mt-6" />
</footer>
