<script lang="ts">
	import { DEFAULT_THEME } from "$lib/constants";
	import { panels } from "$lib/layouts/test";
	import { Splitpanes as Panel, type IPaneSerialized } from "$lib/third-party/svelte-splitpanes";
	import { allSplitpanes } from "$lib/third-party/svelte-splitpanes/state";
	import { debugEvent, generateKeyId, VizStoreValue } from "$lib/utils";
	import SubPanel from "./SubPanel.svelte";

	function constructLayout() {
		
	}

	let { id }: { id: string } = $props();
	const theme = DEFAULT_THEME;
	const saveLayout = new VizStoreValue<Record<string, IPaneSerialized[]>>("layout");
	const storedLayout = saveLayout.get();

	if (storedLayout) {
		for (const [key, values] of Object.entries(storedLayout)) {
			$allSplitpanes.set(key, values);
		}
	}
</script>

<Panel
	keyId={generateKeyId(16)}
	{theme}
	style="height: 100%"
	pushOtherPanes={false}
	{id}
	on:resized={(event) => {
		debugEvent(event);
		saveLayout.set(Object.fromEntries(event.detail));
	}}
>
	<!--
Okay so, here's the problem,

I need a single source of (reactive) truth for the layout.
There are a couple of sources for the layout, that being:
- A described layout like the one in `test.ts`, that includes the Component that
  needs to be rendered by the Pane/SubPanel
- A serialized layout that is stored like the one stored
  in localStorage, that doesn't include any component

I need to find a way to be able to create a single source of truth (likely in the shape of VizSubPanel[])
that can be used to generate the layout (like it is currently below)

I can maybe use a schema of some sort that describes the layout based on a sort of input structure,
similar to what ProseMirror does, but without all of the complicated shape stuff and regex etc etc.
Just something that sort of describes the shape
	-->
	{#each panels as panel}
		{#if !panel.childs}
			<SubPanel {...panel}></SubPanel>
		{:else}
			{@const subpanel = panel.childs.parentSubPanel}
			<SubPanel {...subpanel} header={false}>
				<Panel
					{...panel.childs.parentPanel}
					on:resized={(event) => {
						debugEvent(event);
						saveLayout.set(Object.fromEntries(event.detail));
					}}
				>
					<SubPanel {...panel} />
					{#each panel.childs.subPanel as subPanel}
						<SubPanel {...subPanel} />
					{/each}
				</Panel>
			</SubPanel>
		{/if}
	{/each}
</Panel>
