<script lang="ts">
	import { page } from "$app/state";
	import { onDestroy, onMount, untrack, type Snippet } from "svelte";
	import LoadingContainer from "../LoadingContainer.svelte";
	import { dev } from "$app/environment";
	import type { SvelteHTMLElements } from "svelte/elements";
	import { isElementScrollable } from "$lib/utils/dom";
	import { isLayoutPage } from "$lib/states/index.svelte";

	interface Props {
		children: Snippet;
		name: string;
		disableNameInTitle?: boolean;
		style?: string;
		data?: typeof page.data;
		hasMore?: boolean;
		paginate?: () => void;
		randomLatency?: boolean;
		focusScrollElement?: HTMLElement | null;
	}

	let {
		children,
		name,
		disableNameInTitle = $bindable(false),
		style,
		hasMore = $bindable(false), // default to false, don't spam unnecessarily
		data = $bindable(),
		paginate,
		randomLatency = $bindable(false),
		focusScrollElement,
		...props
	}: SvelteHTMLElements["div"] & Props = $props();

	$effect(() => {
		if (focusScrollElement) {
			focusScrollElement.scrollIntoView({
				behavior: "instant",
				block: "nearest",
				inline: "center"
			});
		}
	});

	let viewContainer: HTMLElement | undefined = $state();
	let isLoading = $state(true);
	const initStyle = $derived(`${isLoading ? "height: 100%;" : ""} ${style}`);
	let pageData = $derived.by(() => {
		if (dev && randomLatency) {
			const randomLatency = Math.floor(Math.random() * 2000) + 500; // Random latency between 1 and 3 seconds in dev mode
			return new Promise((resolve) => {
				setTimeout(() => {
					isLoading = false;
					console.log("random latency:", randomLatency, "ms");
					console.log("pageData resolved:", $state.snapshot(data));
					resolve(data);
				}, randomLatency);
			});
		} else {
			return data;
		}
	});

	// Clean up stuff since this component gets mounted and unmounted often, especially during development
	onDestroy(() => {
		pageData = undefined;
	});

	// Scroll handling
	let scrollThreshold = 2000;
	let observer: IntersectionObserver | undefined;
	let isSentinelIntersecting = $state(false);

	function loadMore() {
		paginate?.();
	}

	function setupObserver(node: HTMLElement) {
		observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				isSentinelIntersecting = entry.isIntersecting;
			},
			{
				root: viewContainer,
				rootMargin: `0px 0px ${scrollThreshold}px 0px`,
				threshold: 0
			}
		);

		observer.observe(node);

		return {
			destroy() {
				observer?.disconnect();
			}
		};
	}

	// Proactive pagination effect: triggers if sentinel is intersecting
	$effect(() => {
		// Depend on data length to re-trigger if we're still intersecting after a load
		const _trigger = data?.length;
		if (hasMore && isSentinelIntersecting) {
			untrack(() => loadMore());
		}
	});

	// Fill screen effect: ensures we have enough content to scroll
	$effect(() => {
		const _trigger = data?.length;
		if (hasMore && viewContainer && !isElementScrollable(viewContainer)) {
			untrack(() => loadMore());
		}
	});

	function onScroll(
		e: UIEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		const target = e.currentTarget;
		if (!target) {
			return;
		}

		// Robust fallback: if we are near the bottom, try to load more.
		// This handles cases where IntersectionObserver might get stuck or not fire correctly.
		const remaining =
			target.scrollHeight - target.scrollTop - target.clientHeight;
		if (remaining < scrollThreshold && hasMore) {
			// Use untrack to avoid reactive loops if this function were reactive (it isn't, but safe practice)
			untrack(() => loadMore());
		}

		props.onscroll?.(e);
	}

	function onResize(
		e: UIEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		onScroll(e);
		props.onresize?.(e);
	}
</script>

<svelte:head>
	{#if page.url.pathname !== "/" && !disableNameInTitle}
		<title>{name}</title>
	{/if}
</svelte:head>
<div
	{...props}
	class="viz-view-container no-select {props.class}"
	onscroll={onScroll}
	onresize={onResize}
	style="{initStyle} {style}"
	data-view-name={name}
	bind:this={viewContainer}
>
	{#if isLayoutPage()}
		{@render children()}
	{:else if data && !randomLatency}
		{@render children()}
		{#if hasMore}
			<div
				use:setupObserver
				style="width: 100%; height: 60px; padding: 20px 0; display: flex; align-items: center; justify-content: center;"
			>
				<LoadingContainer />
			</div>
		{/if}
	{:else}
		{#await pageData}
			<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
				<LoadingContainer />
			</div>
		{:then data}
			{#if data}
				{@render children()}
				{#if hasMore}
					<div
						use:setupObserver
						style="width: 100%; height: 60px; padding: 20px 0; display: flex; align-items: center; justify-content: center;"
					>
						<LoadingContainer />
					</div>
				{/if}
			{:else}
				<p>No data available</p>
			{/if}
		{:catch error}
			<p>Error loading data: {error.message}</p>
		{/await}
	{/if}
</div>

<style>
	.viz-view-container {
		white-space: normal;
		display: block;
		overflow: auto;
		width: 100%;
		max-width: 100%;
		height: 100%;
		position: relative;
	}
</style>
