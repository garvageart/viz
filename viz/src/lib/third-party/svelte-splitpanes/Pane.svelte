<script lang="ts">
	import { getContext, onMount, onDestroy, hasContext } from "svelte";
	import { KEY } from "./Splitpanes.svelte";
	import type { ClientCallbacks, IPane, IPaneSerialized, PaneInitFunction, SplitContext } from "./index.js";
	import { browser } from "./internal/env.js";
	import { gatheringKey } from "./internal/GatheringRound.svelte";
	import { getDimensionName } from "./internal/utils/sizing.js";
	import { carefullCallbackSource } from "./internal/utils/functions";
	import { writable, type Writable } from "svelte/store";
	import { arrayHasDuplicates, generateRandomString, VizStoreValue } from "$lib/utils";
	import { allTabs } from "./state";

	const {
		ssrRegisterPaneSize,
		onPaneInit,
		clientOnly: clientOnlyContext,
		isHorizontal,
		showFirstSplitter,
		veryFirstPaneKey,
		keyId
	} = getContext<SplitContext>(KEY);

	// PROPS

	export let size: number | null = null;
	export let minSize = 0;
	export let maxSize = 100;
	export let snapSize = 0;
	// css class
	let clazz = "";
	export { clazz as class };

	// FOR VIZ ONLY
	// PROPS
	export let smoothExpand = false;
	export let id: string;
	export let paneKeyId: string = "";

	// VARIABLES
	let usedKeyId = paneKeyId ?? generateRandomString(10);
	let usedId = id;
	let isActive: Writable<boolean> = writable(false);
	let tabs = $allTabs.get(paneKeyId);

	// NBBBBBBB: MAKE SURE that elements/panes with the same ID don't happen, like ever
	const storedLayout = new VizStoreValue<Record<string, IPaneSerialized[]>>("layout").get();
	let allPanes = Object.values(storedLayout ?? {}).flat();
	let duplicateAnswer = arrayHasDuplicates(allPanes.map((pane) => pane.id));

	if (duplicateAnswer.hasDuplicates) {
		console.error("The following panes have duplicate IDs. Please check the DOM", duplicateAnswer.duplicates);
		if (duplicateAnswer.duplicates.includes(usedId)) {
			throw Error(`Pane element with id "${usedId}" already exists`);
		}
	}

	let paneInfo: IPaneSerialized | undefined = allPanes.find((pane) => pane.id === usedId);
	if (paneInfo) {
		usedKeyId = paneInfo.keyId;

		size = paneInfo.size;
		minSize = paneInfo.min;
		maxSize = paneInfo.max;
		snapSize = paneInfo.snap;
	}
	// VARIABLES

	const key = {};

	const gathering = !browser && hasContext(gatheringKey);
	const { undefinedPaneInitSize } = (!gathering ? onPaneInit(key) : {}) as ReturnType<PaneInitFunction>;

	let element: HTMLElement;
	let sz: number = size ?? undefinedPaneInitSize;
	let isSplitterActive = false;

	// CALLBACKS

	let clientCallbacks: ClientCallbacks | undefined = undefined;

	/**
	 * This is an object of callbacks that are safe to be called on browser even when the object `clientCallbacks`
	 *  isn't initialized yet (i.e. before `onPaneAdd()`).
	 *
	 * In the case of the object isn't initialized yet, calling this callbacks will do nothing.
	 */

	const carefullClientCallbacks = browser ? carefullCallbackSource(() => clientCallbacks) : undefined;

	const reportGivenSizeChangeSafe = (size: number) => {
		// We put an extra check of `size != sz` here and not in the reactive statement, since we don't want a change
		//  of `sz` to trigger report.
		if (clientCallbacks && size != sz) {
			carefullClientCallbacks?.("reportGivenSizeChange")(size);
		}
	};

	// REACTIVE
	$: {
		if (browser && typeof size === "number") {
			reportGivenSizeChangeSafe(size);
		}
	}

	let transitionClass = smoothExpand ? `transition: ${$isHorizontal ? "height" : "width"} 0.2s ease-out;` : "";
	$: dimension = getDimensionName($isHorizontal);
	$: style = `${dimension}: ${sz}%; ${transitionClass}`;
	$: {
		if (!$isActive) {
			element?.classList.remove("splitpanes__pane__active");
		}
	}

	if (gathering && ssrRegisterPaneSize) {
		ssrRegisterPaneSize(size);
	} else if (browser) {
		onMount(() => {
			const inst: IPane = {
				index: 0,
				key,
				element: element,
				childs: [],
				parent: keyId,
				id: usedId,
				keyId: usedKeyId,
				givenSize: size,
				sz: () => sz,
				setSz: (v) => {
					sz = v;
					if (typeof size === "number" && size !== sz) {
						size = sz;
					}
				},
				min: () => minSize,
				max: () => maxSize,
				snap: () => snapSize,
				setSplitterActive: (isActive: boolean) => {
					isSplitterActive = isActive;
				},
				isReady: false,
				isActive,
				tabs: tabs ?? []
			};

			clientCallbacks = clientOnlyContext?.onPaneAdd(inst);
		});

		onDestroy(() => {
			clientOnlyContext?.onPaneRemove(key);
		});

		onMount(() => {
			document.addEventListener("click", (event) => {
				const target = event.target as HTMLElement;
				if (!target) {
					return;
				}

				if (!element) {
					return;
				}

				if (element.contains(target)) {
					$isActive = true;
				} else {
					$isActive = false;
				}
			});

			return () => {
				document.removeEventListener("click", () => {
					$isActive = false;
				});
			};
		});
	}
</script>

{#if !gathering}
	<!-- Splitter -->
	{#if $veryFirstPaneKey !== key || $showFirstSplitter}
		<!-- this a11y issue is known, and will be taken care of as part of the a11y feature issue in #11 -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<div
			class="splitpanes__splitter {isSplitterActive ? 'splitpanes__splitter__active' : ''}"
			on:mousedown={carefullClientCallbacks?.("onSplitterDown")}
			on:touchstart={carefullClientCallbacks?.("onSplitterDown")}
			on:click={carefullClientCallbacks?.("onSplitterClick")}
			on:dblclick={carefullClientCallbacks?.("onSplitterDblClick")}
		/>
	{/if}

	<!-- Pane -->
	<!-- this a11y issue is known, and will be taken care of as part of the a11y feature issue in #11 -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		id={usedId}
		data-viz-sp-id={usedKeyId}
		class={`splitpanes__pane ${clazz || ""}`}
		bind:this={element}
		on:click={(event) => {
			carefullClientCallbacks?.("onPaneClick")(event);
			$isActive = true;
		}}
		{style}
	>
		<slot />
	</div>
{/if}

<style global lang="scss">
	.transition-vertical {
		transition: width 0.2s ease-out;
	}

	.transition-horizontal {
		transition: height 0.2s ease-out;
	}
</style>
