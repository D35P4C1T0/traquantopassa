<script lang="ts">
	import { startRefresh } from '$lib/refresh';
	import DataStatus from '$lib/components/DataStatus.svelte';
	import Trip from './Trip.svelte';
	import FooterNavigation from '$lib/components/FooterNavigation.svelte';
	import { onMount, setContext } from 'svelte';
	import { resolve } from '$app/paths';
	import { fetchBoard } from '$lib/refresh';
	import type StopGroupDetails from '$lib/StopGroupDetails';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
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
	let showMore = $state(false);
	let limit = $derived(showMore || details.directions.length < 2 ? 15 : 5);
	let showMoreInProgress = $state(false);

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
		aggiornato alle
		{new Date(details.lastUpdatedAt).toLocaleTimeString(['it-IT'], {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Rome',
		})}
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
		<!-- eslint-disable-next-line svelte/require-each-key -->
		{#each details.directions as direction}
			<div class="mt-10 flex flex-col">
				{#if direction.name && details.directions.length > 1}
					<div class="mx-auto mb-4 w-fit text-center text-lg font-medium uppercase">
						{direction.name}
					</div>
				{/if}
				{#if direction.trips.length > 0}
					{#each direction.trips.slice(0, limit) as trip (trip.id)}
						<div
							animate:flip={{
								delay: 0,
								duration: 300,
							}}
							in:fade={{ delay: showMoreInProgress ? 0 : 800, duration: 300 }}
							out:fade={{ duration: 300 }}
						>
							<Trip {trip} stale={details.stale || refreshFailed} />
						</div>
					{/each}

					{#if !showMore && direction.trips.length > limit}
						<button
							class="mt-2 cursor-pointer rounded-md bg-neutral-800 px-3 py-1 text-mid no-underline hover:bg-neutral-700"
							onclick={() => {
								showMore = true;
								showMoreInProgress = true;
								setTimeout(() => {
									showMoreInProgress = false;
								}, 50);
							}}
						>
							Mostra altri {direction.trips.length - limit}
						</button>
					{/if}
				{:else}
					<div class="text-center">Nessun autobus previsto per oggi</div>
				{/if}
			</div>
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
