<script lang="ts">
	import { dev } from "$app/environment";
	import { page } from "$app/state";
	import { untrack } from "svelte";
	import { CLIENT_IS_PRODUCTION, DYNAMIC_ROUTE_REGEX } from "$lib/constants";
	import { performSearch } from "$lib/search/execute";
	import {
		debugState,
		getTheme,
		search,
		toggleTheme,
		user,
		themeState,
		isLayoutPage
	} from "$lib/states/index.svelte";
	import { historyState } from "$lib/states/history.svelte";
	import { eventsState } from "$lib/states/events.svelte";
	import {
		SUPPORTED_IMAGE_TYPES,
		SUPPORTED_RAW_FILES,
		type SupportedImageTypes
	} from "$lib/types/images";
	import UploadManager from "$lib/upload/manager.svelte";
	import hotkeys from "hotkeys-js";
	import type { SvelteHTMLElements } from "svelte/elements";
	import OpenAccountPanel from "../context-menus/AccountPanel.svelte";
	import AppMenu from "../context-menus/AppMenu.svelte";
	import MaterialIcon from "./MaterialIcon.svelte";
	import SearchInput from "./SearchInput.svelte";
	import IconButton from "./IconButton.svelte";
	import { goto } from "$app/navigation";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
	import type { MenuItem } from "$lib/context-menu/types";
	import { views } from "$lib/layouts/views";
	import { workspaceState } from "$lib/states/workspace.svelte";
	import VizView from "$lib/views/views.svelte";

	let { ...props }: SvelteHTMLElements["header"] = $props();

	let searchElement = $state<HTMLInputElement | undefined>();
	let searchInputHasFocus = $derived(
		searchElement && document.activeElement === searchElement
	);

	$effect(() => {
		if (page.url.pathname === "/search") {
			const q = page.url.searchParams.get("q");
			// Only update search.value if 'q' is present and different from current search.value
			// This prevents unnecessary updates and potential infinite loops if search.value also affects the URL
			if (q && q !== untrack(() => search.value)) {
				search.value = q;
			}
		}
	});

	// Ctrl/Cmd+I toggles dev mode
	hotkeys("ctrl+i, command+i", (e) => {
		e.preventDefault();
		debugState.toggle();
	});

	// Ctrl/Cmd+K toggles focus on the search input.
	hotkeys("ctrl+k, command+k", (e) => {
		e.preventDefault();
		if (!searchInputHasFocus) {
			searchElement?.focus();
		} else {
			searchElement?.blur();
		}
	});

	async function handleUpload(e: MouseEvent) {
		e.preventDefault();
		// allowed image types will come from the config but for now just hardcode
		const manager = new UploadManager([
			...SUPPORTED_RAW_FILES,
			...SUPPORTED_IMAGE_TYPES
		] as SupportedImageTypes[]);

		const uploadedImages = await manager.openPickerAndUpload();

		if (uploadedImages.length === 0) {
			return;
		}

		if (page.url.pathname !== "/") {
			toastState.addToast({
				title: "Upload Success",
				type: "success",
				message: `${uploadedImages.length} image(s) sucessfully uploaded`,
				actions: [
					{
						label: "Go to Photos",
						onClick: () => goto("/")
					}
				]
			});
		}
	}

	let openAccPanel = $state(false);
	let openAppMenu = $state(false);
	let appMenuButton: HTMLButtonElement | undefined = $state();

	const activeViewNames = $derived.by(() => {
		const names = new Set<string>();
		const workspace = workspaceState.workspace;
		if (!workspace) {
return names;
}

		const groups = workspace.getAllTabGroups();
		for (const group of groups) {
			for (const view of group.views) {
				if (view && view.name) {
					names.add(view.name);
				}
			}
		}
		return names;
	});

	// Context Menu for Theme
	let ctxShowMenu = $state(false);
	let ctxAnchor = $state<{ x: number; y: number } | null>(null);
	let ctxItems = $state<MenuItem[]>([]);

	function handleThemeContext(e: MouseEvent) {
		e.preventDefault();
		ctxAnchor = { x: e.clientX, y: e.clientY };
		ctxItems = [
			{
				id: "theme-default-system",
				label: "System",
				icon: "settings_brightness",
				action: () => themeState.setPreferredTheme("system"),
				disabled: themeState.preferredTheme === "system"
			},
			{
				id: "theme-default-light",
				label: "Light",
				icon: "light_mode",
				action: () => themeState.setPreferredTheme("light"),
				disabled: themeState.preferredTheme === "light"
			},
			{
				id: "theme-default-dark",
				label: "Dark",
				icon: "dark_mode",
				action: () => themeState.setPreferredTheme("dark"),
				disabled: themeState.preferredTheme === "dark"
			}
		];
		ctxShowMenu = true;
	}

	function handleViewMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		ctxAnchor = { x: e.clientX, y: e.clientY };

		const workspace = workspaceState.workspace;
		if (!workspace) {
            return;
        }

		ctxItems = views
			.filter((view) => !view.path || !DYNAMIC_ROUTE_REGEX.test(view.path))
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((view) => ({
				id: view.name,
				label: view.name,
				action: () => {
					let targetGroup = workspace.activeGroup;

					// Fallback to the first available group if no panel is focused
					if (!targetGroup) {
						targetGroup = workspace.getAllTabGroups()[0];
						if (!targetGroup) {
							toastState.addToast({
								title: "No Panels Available",
								type: "error",
								message: "There are no panels to add the view to."
							});
							return;
						}
						workspace.setActiveGroup(targetGroup.id);
					}

					const existingView = targetGroup.views.find(
						(v) => v.name === view.name
					);

					if (existingView) {
						targetGroup.setActive(existingView.id);
					} else {
						// Create a new view instance (duplicate template)
						const newView = VizView.fromJSON(view.toJSON(), view.component);
						targetGroup.addTab(newView);
					}
				},
				disabled: activeViewNames.has(view.name)
			}));
		ctxShowMenu = true;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== "Escape") {
			return;
		}

		if (searchInputHasFocus) {
			console.log("Escape key pressed, blurring search input");
			searchElement?.blur();
			return;
		}

		if (openAccPanel) {
			openAccPanel = false;
		}

		if (openAppMenu) {
			openAppMenu = false;
		}
	}}
	onclick={(e) => {
		if (
			openAccPanel &&
			!(e.target as HTMLElement).closest("#account-container")
		) {
			openAccPanel = false;
		}
	}}
/>

<header {...props} class="{props.class} no-select">
	<div id="left-menu-container">
		<button
			bind:this={appMenuButton}
			id="viz-title"
			onclick={() => (openAppMenu = !openAppMenu)}
			aria-label="App Menu"
			title="App Menu"
		>
			viz
			<MaterialIcon
				iconName="expand_more"
				weight={300}
				size="1em"
				style="margin-left: 0.15em;"
			/>
		</button>
		<AppMenu bind:isOpen={openAppMenu} bind:anchor={appMenuButton} />
		<div class="menu-separator"></div>
		{#if isLayoutPage()}
			<IconButton
				class="header-button"
				iconName="view_quilt"
				title="Views"
				onclick={handleViewMenu}
			/>
		{:else}
			<IconButton
				class="header-button"
				iconName="space_dashboard"
				title="Go to Workspace"
				onclick={() => goto("/")}
			/>
		{/if}
		<div class="menu-separator"></div>
		<div class="icon-group-container">
			<a class="page-nav-btn" href="/photos" title="Go to Photos">
				<IconButton class="header-button" iconName="photo" />
			</a>
			<a class="page-nav-btn" href="/collections" title="Go to Collections">
				<IconButton class="header-button" iconName="collections" />
			</a>
		</div>
	</div>
	<div class="center-container">
		<IconButton
			class="header-button"
			iconName="arrow_back"
			disabled={!historyState.canGoBack}
			onclick={() => history.back()}
		/>
		<IconButton
			class="header-button"
			iconName="arrow_forward"
			disabled={!historyState.canGoForward}
			onclick={() => history.forward()}
		/>
		<div class="menu-separator"></div>
		<SearchInput
			inputId="header-search"
			placeholder="Search (Ctrl/Cmd + K)"
			bind:searchInputHasFocus
			bind:loading={search.loading}
			bind:value={search.value}
			bind:element={searchElement}
			{performSearch}
			style="width: 100%;"
		/>
	</div>
	<div class="header-button-container">
		{#if eventsState.initialized && !eventsState.connected}
			<div class="offline-badge" title="Server Offline (WebSocket Disconnected)">
				<span class="offline-dot"></span>
				<span>Offline</span>
			</div>
		{/if}
		<IconButton
			weight={300}
			iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"}
			id="theme-toggle"
			class="header-button theme-toggle"
			title="Toggle theme (Right-click to set default)"
			aria-label="Toggle Theme"
			onclick={() => toggleTheme()}
			oncontextmenu={handleThemeContext}
		/>
		<IconButton
			iconName="upload"
			iconStyle="sharp"
			id="header-upload-button"
			class="header-button"
			aria-label="Upload"
			onclick={handleUpload}
		>
			<span style="font-size: 0.75rem; font-weight: 500;"> Upload </span>
		</IconButton>
		{#if dev || !CLIENT_IS_PRODUCTION}
			<IconButton
				iconName="bug_report"
				id="debug-button"
				class="header-button"
				aria-label="Toggle Debug Mode"
				onclick={() => debugState.toggle()}
				title="Toggle Debug Mode"
			>
				<span class="debug-mode-text">{debugState.value ? "ON" : "OFF"}</span>
			</IconButton>
		{/if}
		<div id="account-container">
			<button
				id="account-button"
				aria-label="Account"
				onclick={() => (openAccPanel = !openAccPanel)}
				title={user.data?.name
					? `${user.data.name} (${user.data.email})`
					: "Account"}
			>
				<figure
					style="height: 100%; display: flex; align-items: center; justify-content: center;"
				>
					<span style="font-weight: 800; font-size: 0.9em;"
						>{user.data ? user.data.name[0] : "?"}</span
					>
				</figure>
			</button>
			{#if openAccPanel}
				<OpenAccountPanel bind:openAccPanel />
			{/if}
		</div>
	</div>
</header>

<ContextMenu
	bind:showMenu={ctxShowMenu}
	bind:items={ctxItems}
	anchor={ctxAnchor}
/>

<style lang="scss">
	header {
		background-color: var(--viz-bg-color);
		height: var(--viz-header-height);
		padding: 0 var(--viz-spacing-md);
		display: flex;
		align-items: center;
		border-bottom: var(--viz-border-thin);
		position: relative;
		justify-content: space-between;
		flex-direction: row;
		box-sizing: border-box;
	}

	#viz-title {
		font-family: var(--viz-mono-font);
		font-weight: 700;
		font-size: var(--viz-font-size-std);
		display: flex;
		align-items: center;
		gap: var(--viz-spacing-xxs);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--viz-text-color);
		cursor: pointer;
		padding: var(--viz-spacing-xxs) 0;
		border-radius: 0;
		transition: border-color 150ms ease;

		&:hover {
			background-color: transparent;
			border-bottom-color: var(--viz-primary);
		}

		&:active {
			background-color: transparent;
			border-bottom-color: var(--viz-secondary);
		}
	}

	#left-menu-container {
		border-radius: var(--viz-border-radius-sm);
		z-index: 300;
		gap: var(--viz-spacing-sm);
		height: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.menu-separator {
		background-color: var(--viz-60);
		height: 50%;
		width: 1px;
	}

	.icon-group-container {
		gap: var(--viz-spacing-xs);
		display: flex;
		flex-direction: row;
	}

	.page-nav-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		text-decoration: none;
	}

	.center-container {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--viz-spacing-sm);
		width: 30%;
		height: 100%;
	}

	#account-container {
		position: relative;
	}

	#account-button {
		height: 1.75rem;
		width: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--viz-border-radius-pill);
		border: var(--viz-border-thin);
		border-color: var(--viz-60);
		background-color: var(--viz-90);
		cursor: pointer;
		outline: none;
		transition: background-color 150ms ease, border-color 150ms ease;

		&:hover {
			background-color: var(--viz-80);
			border-color: var(--viz-50);
		}

		&:focus-visible {
			box-shadow: 0 0 0 2px var(--viz-bg-color), 0 0 0 4px var(--viz-primary);
		}
	}

	figure {
		display: block;
		margin-block-start: 0em;
		margin-block-end: 0em;
		margin-inline-start: 0px;
		margin-inline-end: 0px;
		unicode-bidi: isolate;
	}

	:global(#header-upload-button) {
		margin: 0 var(--viz-spacing-sm);
		color: var(--viz-text-color);
	}

	:global(.header-button) {
		font-size: 0.8rem !important;
		padding: var(--viz-spacing-xxs) var(--viz-spacing-xs) !important;
		border: 1px solid transparent !important;
		background-color: transparent !important;

		&:hover {
			background-color: var(--viz-90) !important;
			border-color: var(--viz-80) !important;
		}

		&:active {
			background-color: var(--viz-80) !important;
		}
	}

	.header-button-container {
		display: flex;
		align-items: center;
		gap: var(--viz-spacing-sm);
	}

	.debug-mode-text {
		margin-right: 0.4em;
		font-family: var(--viz-mono-font);
		font-weight: 500;
		font-size: 1em;
	}

	.offline-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--viz-spacing-xs);
		background-color: transparent;
		border: var(--viz-border-thin);
		border-color: var(--viz-error-color);
		color: var(--viz-error-color);
		padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
		border-radius: var(--viz-border-radius-sm);
		font-size: var(--viz-font-size-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		line-height: 1;
		user-select: none;
	}

	.offline-dot {
		width: 6px;
		height: 6px;
		background-color: var(--viz-error-color);
		border-radius: var(--viz-border-radius-pill);
		display: inline-block;
		animation: offline-pulse 1.5s infinite ease-in-out;
	}

	@keyframes offline-pulse {
		0% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.4;
		}
	}

</style>
