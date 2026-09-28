<script lang="ts">
	import '$lib/polyfills';
	import '@fontsource-variable/inter';
	import '../app.css';
	import { navigating } from '$app/state';
	import { onMount, setContext, type Snippet } from 'svelte';
	import type { Topbar } from 'topbar';
	import { favoriteStopsStore } from '$lib/storage/favorites.svelte';

	interface Props {
		children?: Snippet;
		data: import('./$types').LayoutData;
	}

	let { children, data }: Props = $props();

	let topbar: Topbar | undefined = $state();

	onMount(async () => {
		topbar = (await import('topbar')) as unknown as Topbar;
		topbar.config({
			barColors: {
				'0': '#ffffff',
			},
		});
	});

	$effect(() => {
		if (navigating.to) {
			topbar?.show(150);
		} else {
			topbar?.hide();
		}
	});

	setContext('favorites', favoriteStopsStore());
</script>

<svelte:head>
	{#if data.analyticsUrl}
		<script
			defer
			src="https://gc.zgo.at/count.js"
			data-goatcounter="{data.analyticsUrl}/count"
		></script>
	{/if}
</svelte:head>

<div class="mx-auto mt-10 max-w-[600px] px-5">
	{@render children?.()}
</div>
