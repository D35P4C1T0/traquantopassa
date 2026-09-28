<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	let {
		cachedAt,
		stale = false,
		partial = false,
		metadataStale = false,
		failed = false,
		children,
	}: {
		cachedAt: Date;
		stale?: boolean;
		partial?: boolean;
		metadataStale?: boolean;
		failed?: boolean;
		children?: Snippet;
	} = $props();
	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1_000);
		return () => clearInterval(timer);
	});
	const age = $derived(Math.max(0, Math.floor((now - new Date(cachedAt).getTime()) / 1000)));
</script>

{#if stale || failed || age > 45 || partial || metadataStale}
	<div
		role="status"
		class="mt-4 rounded-md border border-amber-600 bg-amber-950 p-3 text-sm text-amber-100"
	>
		{#if stale || failed || age > 45}
			<p class="m-0">
				Aggiornamento non disponibile. Ultimi dati ricevuti {age} secondi fa; gli orari possono essere
				cambiati.
			</p>
		{/if}
		{#if partial}<p class="m-0">Dati parziali: alcune corse non sono disponibili.</p>{/if}
		{#if metadataStale}<p class="m-0">Elenco fermate o linee non aggiornato.</p>{/if}
	</div>
{/if}

{#if age >= 120}
	<p role="status" class="my-8 text-center">
		Dati troppo vecchi. Gli orari saranno mostrati al prossimo aggiornamento riuscito.
	</p>
{:else}
	{@render children?.()}
{/if}
