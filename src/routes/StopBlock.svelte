<script lang="ts">
	import { resolve } from '$app/paths';
	import { mapRouteIdsToRoutes } from '$lib/routes-helper';
	import type { StopGroup } from '$lib/StopGroup';
	import type { Route } from '$lib/Route';
	import StopFavoriteButton from '$lib/components/StopFavoriteButton.svelte';

	interface Props {
		stop: StopGroup;
		routes: Route[];
	}

	let { stop, routes }: Props = $props();
</script>

<div class="relative w-full">
	<a
		href={resolve('/[stop]', { stop: stop.slugs[0] })}
		class="block h-full w-full rounded-lg bg-neutral-800 pt-3 pr-12 pb-4 pl-4 no-underline"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex flex-col gap-1">
				<span class="leading-snug">{stop.name}</span>
				<span class="text-sm text-neutral-500 no-underline">
					/{stop.slugs[0]}
				</span>
			</div>
		</div>
		<div class="mt-4 flex flex-wrap gap-2">
			{#each mapRouteIdsToRoutes(stop.routeIds, routes) as route (route.id)}
				<div
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-base font-semibold select-none"
					style="background-color: {route.color}"
				>
					{route.name}
				</div>
			{/each}
		</div>
	</a>

	<StopFavoriteButton stopCode={stop.code} className="absolute right-3 top-3 p-1" />
</div>
