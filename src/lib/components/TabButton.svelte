<script lang="ts">
	interface Props {
		text: string;
		isSelected: boolean;
		onClick: () => void;
	}

	let { text, isSelected, onClick }: Props = $props();
</script>

<button
	aria-pressed={isSelected}
	class="inline-flex h-8 grow basis-1/3 cursor-pointer items-center justify-center rounded-md px-3 py-5 leading-none no-underline"
	class:bg-neutral-100={isSelected}
	class:hover:bg-neutral-200={isSelected}
	class:text-neutral-800={isSelected}
	class:font-semibold={isSelected}
	class:bg-neutral-800={!isSelected}
	class:hover:bg-neutral-700={!isSelected}
	onclick={onClick}
>
	{text}
</button>
