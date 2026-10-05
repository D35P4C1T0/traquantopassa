<script lang="ts">
	import type { Trip, ExpandedTripState } from '$lib/Trip';
	import LiveTripAnimation from './LiveTripAnimation.svelte';
	import PulsingMinutes from './PulsingMinutes.svelte';
	import { Flag } from '@lucide/svelte';
	import BusTripDetail from './BusTripDetail.svelte';
	import { slide } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { TimeState } from '$lib/clock.svelte';

	interface Props {
		trip: Trip;
		stale?: boolean;
	}

	let { trip, stale = false }: Props = $props();

	const clock = getContext<TimeState>('timeState');
	const outdated = $derived(
		trip.lastUpdatedTimestamp !== null && clock.now - trip.lastUpdatedTimestamp > 300_000,
	);
	let expandedTrip = getContext<ExpandedTripState>('expandedTrip');
	let expanded = $derived(expandedTrip.id === trip.id);

	function toggle() {
		expandedTrip.id = expanded ? null : trip.id;
	}
</script>

<button
	type="button"
	class="mb-2 flex w-full cursor-pointer items-center gap-x-4 text-left"
	aria-expanded={expanded}
	onclick={() => toggle()}
>
	<span
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl font-bold select-none"
		style="background-color: {trip.routeColor}"
	>
		{trip.routeName}
	</span>
	<span class="grow overflow-hidden whitespace-nowrap">
		<span
			class="flex items-center gap-x-2 overflow-hidden text-lg leading-tight text-ellipsis whitespace-nowrap"
			class:text-neutral-500={trip.isEndOfRouteForUser}
			class:font-medium={!trip.isEndOfRouteForUser}
		>
			{trip.destination}
			{#if trip.isEndOfRouteForUser}
				<Flag class="size-4" strokeWidth={2.5} />
			{/if}
		</span>
		<span class="block text-xs leading-none text-neutral-500">
			{#if trip.delay != null}
				{@const distanceInStops = trip.userStopSequenceNumber - trip.currentStopSequenceNumber}

				{#if trip.currentStopSequenceNumber === -1}
					sulla corsa precedente
				{:else if trip.currentStopSequenceNumber === 0}
					non ancora partito
				{:else if trip.currentStopSequenceNumber === trip.stopTimes.length}
					corsa terminata
				{:else if distanceInStops < 0}
					oltre la tua fermata
				{:else if distanceInStops === 0}
					alla tua fermata
				{:else if distanceInStops === 1}
					a 1 fermata da te
				{:else}
					a {distanceInStops} fermate da te
				{/if}
				{#if trip.currentStopSequenceNumber === 1}
					(1ª fermata)
				{/if}

				•

				{#if trip.delay === 0}
					in orario
				{:else if trip.delay > 0}
					in ritardo di {trip.delay} min
				{:else}
					in anticipo di {-trip.delay} min
				{/if}
			{/if}
		</span>
	</span>
	<PulsingMinutes minutes={trip.minutes} dimmed={trip.isEndOfRouteForUser} />
	<LiveTripAnimation
		live={trip.delay != null ? (outdated || trip.isOutdated || stale ? 'yellow' : 'green') : null}
	/>
</button>

{#if expanded}
	<div transition:slide={{ duration: 300 }}>
		<BusTripDetail {trip} />
	</div>
{/if}
