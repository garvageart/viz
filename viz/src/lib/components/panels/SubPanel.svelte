<script module lang="ts">
	import { type Component } from "svelte";
	import Splitpanes from "$lib/third-party/svelte-splitpanes/Splitpanes.svelte";
	// TODO: Reorganise and clean up component
	// e.g. move types to seperate file, clean up props etc etc

	export interface VizTab {
		name: string;
		opticalCenterFix?: number;
		component: Component;
		id: number;
		parent?: string;
		isActive?: boolean;
	}

	export type VizSubPanel = Props &
		ComponentProps<typeof Pane> & {
			childs?: {
				parentSubPanel: Omit<VizSubPanel, "childs" | "children" | "$$events" | "$$slots" | "header" | "tabs">;
				parentPanel: Omit<ComponentProps<typeof Splitpanes>, "children" | "$$events" | "$$slots">;
				subPanel: Omit<VizSubPanel, "childs">[];
			};
		};
</script>

<script lang="ts">
	import type { ComponentProps, Snippet } from "svelte";
	import { Pane } from "$lib/third-party/svelte-splitpanes";
	import { generateKeyId, resetAndReloadLayout, swapArrayElements } from "$lib/utils";
	import MaterialIcon from "../MaterialIcon.svelte";
	import { allTabs, layoutState } from "$lib/third-party/svelte-splitpanes/state";
	import { views } from "$lib/layouts/test";
	import { dev } from "$app/environment";

	if (dev) {
		window.resetAndReloadLayout = resetAndReloadLayout;
	}

	interface Props {
		id: string;
		header?: boolean;
		tabs: VizTab[];
		children?: Snippet;
	}

	interface TabData {
		index: number;
		data: VizTab;
	}

	const defaultClass = "viz-panel";
	let className: string = $state(defaultClass);

	const allProps: Props & ComponentProps<typeof Pane> = $props();

	let panelTabs = $state(allProps.tabs ?? []);
	let id = allProps.id;
	let header = allProps.header ?? true;

	const children = allProps.children;
	const keyId = allProps.paneKeyId ?? generateKeyId();
	const minSize = allProps.minSize ?? 10;

	// inject parent id into tabs
	for (const tab of panelTabs) {
		tab.parent = keyId;
		tab.component = views.find((view) => view.id === tab.id)?.component!;
	}

	if (allProps.class) {
		className = allProps.class;
	}

	if (header === true && panelTabs.length === 0) {
		throw Error("Viz: Header is showing, but no tabs are provided for: " + keyId);
	}

	const storedActiveTab = $allTabs.get(keyId)?.find((tab) => tab.isActive === true);
	let activeTab = $state.raw(storedActiveTab ?? panelTabs[0]);

	if (panelTabs.length > 0) {
		$allTabs.set(keyId, panelTabs);
		panelTabs[0].isActive = true;
	} else {
		$allTabs.delete(keyId);
	}

	if (window.debug === true) {
		$inspect("panel tabs " + keyId, panelTabs);
		$inspect("all tabs " + keyId, $allTabs);
	}

	function draggable(node: HTMLElement, data: TabData) {
		let state = JSON.stringify(data);

		node.draggable = true;

		node.addEventListener("dragstart", (e) => {
			e.dataTransfer?.setData("text/json", state);
		});

		return {
			update(data: TabData) {
				state = JSON.stringify(data);
			},
			destroy() {
				node.removeEventListener("dragstart", (e) => {
					e.dataTransfer?.setData("text/json", state);
				});
			}
		};
	}

	function onDropOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "move";
		}
	}

	function ondrop(node: HTMLElement, event: DragEvent) {
		event.preventDefault();

		if (event.dataTransfer) {
			const data = event.dataTransfer.getData("text/json");
			const state = JSON.parse(data) as TabData;
			const tabKeyId = node.getAttribute("data-tab-id");
			const nodeParentId = node.parentElement?.getAttribute("data-viz-sp-id");

			if (state.data.id === parseInt(tabKeyId!)) {
				return;
			}

			if (!nodeParentId) {
				throw new Error("Viz: Node parent ID is missing");
			}

			if (panelTabs.map((tab) => tab.id).includes(state.data.id) === false) {
				// Remove it from its original pane first
				const splicedTabs = $allTabs.get(state.data.parent!)?.splice(state.index, 1);

				if (!splicedTabs || splicedTabs.length === 0) {
					return;
				}

				state.data.component = splicedTabs[0].component;
				state.data.isActive = true;

				panelTabs.push(...splicedTabs);
				$allTabs.set(keyId, [...panelTabs]);

				// This almost works except that currently we are explcitly
				// using currentLayout[0] instead of finding the index
				// so that's a problem, as well as a few other minor bugs
				// Also this code looks like shit and needs a whole refactor

				// Note: Next bit of code is partially written by Co-Pilot for anyone (including myself) wondering
				// -------------------------------------------------------------------------------------
				// if a panel has a child subpanel with tabs
				// move that tab to the top before we destroy the parent
				// --- PROMOTE CHILD TAB TO PARENT TAB IF PARENT TAB MOVES TO A DIFFERENT SUBPANEL ---
				const currentLayout = $layoutState;

				// --- Check if moving from one child subpanel to another subpanel ---
				const getSubPanelParent = (paneKeyId: string) => {
					if (!paneKeyId) {
						return null;
					}

					for (const panel of currentLayout) {
						if (!panel.childs?.subPanel) {
							continue;
						}

						for (const sub of panel.childs.subPanel) {
							if (sub.paneKeyId === paneKeyId) {
								return panel.paneKeyId;
							}
						}
					}

					return null;
				};

				let parentIndex = currentLayout.findIndex((panel) => panel.paneKeyId === state.data.parent);
				let childParentIndex = -1;

				if (parentIndex === -1) {
					// Try to find the parent panel that contains the child subpanel with paneKeyId === state.data.parent
					parentIndex = currentLayout.findIndex(
						(panel) => panel.childs && panel.childs.subPanel?.some((sub) => sub.paneKeyId === state.data.parent)
					);
				}

				const childs = currentLayout[parentIndex]?.childs;

				if (!childs) {
					return;
				}

				const hasChildSubPanel = childs.subPanel && childs.subPanel?.length > 0;
				const childPanel = childs.subPanel?.find((panel) => panel.paneKeyId === nodeParentId);
				const childPanelIndex = childs.subPanel?.findIndex((panel) => panel.paneKeyId === nodeParentId);

				const sourceSubPanelParent = getSubPanelParent(state.data.parent!);
				const destSubPanelParent = getSubPanelParent(nodeParentId);
				const isMovingBetweenChildSubpanels =
					sourceSubPanelParent &&
					destSubPanelParent &&
					sourceSubPanelParent === destSubPanelParent &&
					state.data.parent !== nodeParentId;

				if (isMovingBetweenChildSubpanels) {
					// Remove tab from source child subpanel
					const sourceChildIdx = childs.subPanel?.findIndex((sub) => sub.paneKeyId === state.data.parent)!;
					const destChildIdx = childs.subPanel?.findIndex((sub) => sub.paneKeyId === nodeParentId)!;
					if (sourceChildIdx !== -1 && destChildIdx !== -1) {
						// Remove tab from source child
						const tabIdx = childs.subPanel[sourceChildIdx].tabs.findIndex((tab) => tab.id === state.data.id);
						if (tabIdx !== -1) {
							const movedTab = childs.subPanel[sourceChildIdx]?.tabs.splice(tabIdx!, 1)[0];
							// Add tab to destination
							childs.subPanel[destChildIdx].tabs.push(movedTab!);
							// Update parent reference
							movedTab.parent = nodeParentId;

							if (childs.subPanel[sourceChildIdx].tabs.length === 0) {
								childs.subPanel.splice(sourceChildIdx, 1);
							}
						}
					} else {
					}

					// Update layout state
					$layoutState = [...currentLayout];
				} else if (
					parentIndex !== -1 &&
					state.data.parent !== nodeParentId &&
					currentLayout.findIndex((panel) => panel.paneKeyId === nodeParentId) !== -1
				) {
					// Moving a tab from one parent subpanel to a different parent subpanel (or its child)
					const sourceParentIdx = currentLayout.findIndex((panel) => panel.paneKeyId === state.data.parent);
					const destParentIdx = currentLayout.findIndex((panel) => panel.paneKeyId === nodeParentId);
					if (sourceParentIdx !== -1 && destParentIdx !== -1) {
						// Remove tab from source parent
						const sourceTabs = currentLayout[sourceParentIdx].tabs;
						const tabIdx = sourceTabs.findIndex((tab) => tab.id === state.data.id);
						let movedTab;
						if (tabIdx !== -1) {
							movedTab = sourceTabs.splice(tabIdx, 1)[0];
							movedTab.parent = nodeParentId;
						}
						// Add tab to destination parent
						if (movedTab) {
							if (!currentLayout[destParentIdx].tabs) {
								currentLayout[destParentIdx].tabs = [];
							}
							currentLayout[destParentIdx].tabs.push(movedTab);
						}
						// If source parent has no more tabs, promote only the first child subpanel to parent and remove it from subPanel
						if (sourceTabs.length === 0 && currentLayout[sourceParentIdx].childs?.subPanel?.length) {
							const firstChild = currentLayout[sourceParentIdx].childs.subPanel[0];
							// Copy properties from firstChild to the parent panel
							Object.assign(currentLayout[sourceParentIdx], {
								id: firstChild.id,
								maxSize: firstChild.maxSize,
								minSize: firstChild.minSize,
								paneKeyId: firstChild.paneKeyId,
								tabs: firstChild.tabs,
								// If you want to keep the rest of the childs.subPanel (minus the promoted one)
								childs: {
									...currentLayout[sourceParentIdx].childs,
									subPanel: currentLayout[sourceParentIdx].childs.subPanel.slice(1)
								}
							});
						} else if (sourceTabs.length === 0) {
							// Just remove the empty panel
							currentLayout.splice(sourceParentIdx, 1);
						}
						$layoutState = [...currentLayout];
					}
				} else if (parentIndex !== -1 && childPanel) {
					// Detect if moving a parent tab to its own child subpanel
					// check if current subpanel has a specific tab

					// Promote the child subpanel to the parent level
					const currentParentPanel = currentLayout[parentIndex];
					const newParentPanel = {
						...currentParentPanel,
						id: childPanel.id,
						maxSize: childPanel.maxSize,
						minSize: childPanel.minSize,
						paneKeyId: childPanel.paneKeyId,
						tabs: childPanel.tabs
					};
					// Move the parent tab into the new parent's tabs
					newParentPanel.tabs!.push(state.data);

					// Remove the child from the parent's subPanel array
					if (childs && childs.subPanel) {
						childs.subPanel = childs.subPanel.filter((panel) => panel.paneKeyId !== nodeParentId);
					}

					newParentPanel.childs = childs;
					// Replace the parent with the promoted child
					currentLayout.splice(parentIndex, 1, newParentPanel);

					// Update layout state
					$layoutState = [...currentLayout];
				} else if (
					parentIndex !== -1 &&
					state.data.parent !== nodeParentId &&
					// nodeParentId is a child subpanel of a different parent
					currentLayout.some((panel) => panel.childs?.subPanel?.some((sub) => sub.paneKeyId === nodeParentId))
				) {
					// Find the source parent and the destination parent/child
					const sourceParentIdx = currentLayout.findIndex((panel) => panel.paneKeyId === state.data.parent);
					const destParentIdx = currentLayout.findIndex((panel) =>
						panel.childs?.subPanel?.some((sub) => sub.paneKeyId === nodeParentId)
					);
					if (sourceParentIdx !== -1 && destParentIdx !== -1) {
						// Remove tab from source parent
						const sourceTabs = currentLayout[sourceParentIdx].tabs;
						const tabIdx = sourceTabs.findIndex((tab) => tab.id === state.data.id);
						let movedTab;
						if (tabIdx !== -1) {
							movedTab = sourceTabs.splice(tabIdx, 1)[0];
							movedTab.parent = nodeParentId;
						}
						// Add tab to destination child subpanel
						const destChildIdx = currentLayout[destParentIdx].childs?.subPanel?.findIndex(
							(sub) => sub.paneKeyId === nodeParentId
						);
						if (
							movedTab &&
							typeof destChildIdx === "number" &&
							destChildIdx !== -1 &&
							currentLayout[destParentIdx].childs?.subPanel
						) {
							currentLayout[destParentIdx].childs.subPanel[destChildIdx].tabs.push(movedTab);
						}
						// If source parent has no more tabs, promote only the first child subpanel to parent and remove it from subPanel
						if (sourceTabs.length === 0 && currentLayout[sourceParentIdx].childs?.subPanel?.length) {
							const firstChild = currentLayout[sourceParentIdx].childs.subPanel[0];
							Object.assign(currentLayout[sourceParentIdx], {
								id: firstChild.id,
								maxSize: firstChild.maxSize,
								minSize: firstChild.minSize,
								paneKeyId: firstChild.paneKeyId,
								tabs: firstChild.tabs,
								childs: {
									...currentLayout[sourceParentIdx].childs,
									subPanel: currentLayout[sourceParentIdx].childs.subPanel.slice(1)
								}
							});
						} else if (sourceTabs.length === 0) {
							currentLayout.splice(sourceParentIdx, 1);
						}
						$layoutState = [...currentLayout];
					}
				} else if (
					parentIndex !== -1 &&
					hasChildSubPanel &&
					keyId === nodeParentId && // Moving to the parent subpanel
					state.data.parent !== keyId // Only if coming from a child subpanel
				) {
					// Find the source parent panel (the one containing the subpanel with state.data.parent)
					let sourceParentIndex = currentLayout.findIndex((panel) =>
						panel.childs?.subPanel?.some((sub) => sub.paneKeyId === state.data.parent)
					);
					let sourceChildSubPanelIdx = -1;
					if (sourceParentIndex !== -1) {
						sourceChildSubPanelIdx =
							currentLayout[sourceParentIndex].childs?.subPanel.findIndex((sub) => sub.paneKeyId === state.data.parent) ??
							sourceChildSubPanelIdx;
					}

					// Find the destination parent panel (the one containing the subpanel with nodeParentId)
					let destParentIndex = currentLayout.findIndex(
						(panel) => panel.paneKeyId === nodeParentId || panel.childs?.subPanel?.some((sub) => sub.paneKeyId === nodeParentId)
					);

					// If moving from a child subpanel of one parent to a child or parent of another parent
					if (
						sourceParentIndex !== -1 &&
						destParentIndex !== -1 &&
						(sourceParentIndex !== destParentIndex || state.data.parent !== nodeParentId)
					) {
						// Remove the tab from the source child subpanel
						const sourceChildSubPanel = currentLayout[sourceParentIndex].childs?.subPanel[sourceChildSubPanelIdx];
						const movedTab = sourceChildSubPanel?.tabs.splice(state.index, 1)[0];

						if (!movedTab) {
							throw new Error("idk man");
						}

						// Remove the source child subpanel if empty
						if (sourceChildSubPanel?.tabs.length === 0) {
							currentLayout[sourceParentIndex].childs?.subPanel.splice(sourceChildSubPanelIdx, 1);
						}

						// Add the tab to the destination
						if (currentLayout[destParentIndex].paneKeyId === nodeParentId) {
							// Move to parent panel
							if (!currentLayout[destParentIndex].tabs) currentLayout[destParentIndex].tabs = [];
							currentLayout[destParentIndex].tabs.push(movedTab);
							movedTab.parent = nodeParentId;
						} else {
							// Move to child subpanel
							const destChildSubPanelIdx = currentLayout[destParentIndex].childs?.subPanel.findIndex(
								(sub) => sub.paneKeyId === nodeParentId
							);
							if (typeof destChildSubPanelIdx === "number" && destChildSubPanelIdx !== -1) {
								currentLayout[destParentIndex].childs?.subPanel[destChildSubPanelIdx].tabs.push(movedTab);
								movedTab.parent = nodeParentId;
							}
						}
						// Update layout state
						$layoutState = [...currentLayout];
					}
				} else {
					let panelToRemoveFrom: VizSubPanel;

					if (childPanelIndex !== -1) {
						const currentTabParent = childs.subPanel.find((panel) => panel.paneKeyId === state.data.parent)!;

						if (currentTabParent && currentTabParent.tabs.length === 1) {
							panelToRemoveFrom = childs.subPanel.splice(childParentIndex, 1)[0] as VizSubPanel;
						} else {
							panelToRemoveFrom = currentTabParent as VizSubPanel;
						}
					} else {
						const currentTabParent = currentLayout.find((panel) => panel.paneKeyId === state.data.parent);

						if (currentTabParent && currentTabParent.tabs.length === 1) {
							panelToRemoveFrom = currentLayout.splice(parentIndex, 1)[0] as VizSubPanel;
						} else {
							panelToRemoveFrom = currentTabParent as VizSubPanel;
						}
					}

					const normalMovedTabs = panelToRemoveFrom.tabs.splice(state.index, 1)[0];
					const subPanelToUpdate = currentLayout.find((panel) => panel.paneKeyId === keyId);

					subPanelToUpdate?.tabs.push(normalMovedTabs!);

					// Update layout state
					$layoutState = [...currentLayout];
				}

				state.data.parent = nodeParentId!;
				state.index = panelTabs.length - 1;
				activeTab = state.data;

				return;
			}

			if (panelTabs.length === 1) {
				return;
			}

			const originalTab = panelTabs.find((tab) => tab.id === state.data.id);
			if (!originalTab) {
				return;
			}

			// JSON.stringify got rid of the component,
			// so just get it from the original tab
			state.data.component = originalTab.component;

			// If element is dropped on the header, just move the element
			// to the end of the array since there are no other elements
			// in the header
			const tabIndex = panelTabs.findIndex((tab) => tab.id === state.data.id);

			if (tabIndex === panelTabs.length - 1) {
				activeTab = state.data;
				return;
			}

			if (node.classList.contains("viz-sub_panel-header") && tabIndex === state.index) {
				panelTabs.push(state.data);
				// index shifts up one when added towards the end
				// so just track back
				//
				// btw: this is so wank but it works
				if (state.index === 0) {
					panelTabs.splice(state.index, 1);
				} else {
					panelTabs.splice(state.index - 1, 1);
				}
			} else if (tabIndex === state.index) {
				// Swap it if it's dropped on a tab
				swapArrayElements(
					panelTabs,
					state.index,
					panelTabs.findIndex((tab) => tab.id === parseInt(node.getAttribute("data-tab-id")!))
				);
			}

			activeTab = state.data;
		}
	}

	function tabDrop(node: HTMLElement) {
		node.addEventListener("drop", (e) => {
			node.classList.remove("drop-hover-above");
			ondrop(node, e);
		});

		node.addEventListener("dragenter", (e) => {
			e.preventDefault();
			if (node === e.target) {
				return;
			}

			node.classList.add("drop-hover-above");
		});

		node.addEventListener("dragleave", (e) => {
			const target = e.target as HTMLElement;
			if (node === target) {
				return;
			}

			node.classList.remove("drop-hover-above");
		});

		node.addEventListener("dragend", (e) => {
			node.classList.remove("drop-hover-above");
		});

		return {
			destroy() {
				node.removeEventListener("drop", (e) => {
					ondrop(node, e);
				});

				node.removeEventListener("dragenter", (e) => {
					e.preventDefault();
					if (node === e.target) {
						return;
					}
				});

				node.removeEventListener("dragend", (e) => {
					node.classList.remove("drop-hover-above");
				});
			}
		};
	}
</script>

<Pane class={className} {minSize} {...allProps} {id} paneKeyId={keyId}>
	{#if header && panelTabs.length > 0}
		<!--
	TODO:
	Make the header draggable too. Use the same drag functions. If we're dragging
	a header into a different panel, place that panel in place and update the state
	for Splitpanes
		-->
		<div class="viz-sub_panel-header" role="tablist" tabindex="0" use:tabDrop ondragover={(event) => onDropOver(event)}>
			{#each panelTabs as tab, i}
				{#if tab.name.trim() != ""}
					{@const tabNameId = tab.name.toLowerCase().replaceAll(" ", "-")}
					{@const data = { index: i, data: tab }}
					<button
						id={tabNameId + "-tab"}
						class="viz-tab-button {activeTab.id === tab.id ? 'active-tab' : ''}"
						data-tab-id={tab.id}
						role="tab"
						title={tab.name}
						aria-label={tab.name}
						onclick={() => {
							activeTab.isActive = false;
							tab.isActive = true;
							activeTab = tab;
						}}
						use:draggable={data}
						use:tabDrop
						ondragover={(event) => onDropOver(event)}
					>
						<span class="viz-sub_panel-name">{tab.name}</span>
						<!--
						Every tab name needs to manually align itself with the icon
						Translate is used instead of margin or position is used to avoid
						shifting the layout  
						-->
						<MaterialIcon showHoverBG={true} style={`transform: translateY(${tab.opticalCenterFix ?? 0.5}px);`} iconName="menu" />
					</button>
				{/if}
			{/each}

			<button
				id="viz-debug-button"
				class="viz-tab-button"
				aria-label="Reset and Reload"
				title="Reset and Reload"
				onclick={() => resetAndReloadLayout()}
			>
				<span class="viz-sub_panel-name">Reset Layout</span>
				<MaterialIcon iconName="refresh" />
			</button>
		</div>
	{/if}
	{#if activeTab?.component}
		{@const Comp = activeTab.component}
		<div class="viz-sub_panel-content">
			<Comp />
		</div>
	{/if}
	{#if children}
		<div class="viz-sub_panel-content" data-pane-key={keyId}>
			{@render children?.()}
		</div>
	{/if}
</Pane>

<style lang="scss">
	#viz-debug-button {
		position: absolute;
		right: 0;
	}

	.viz-sub_panel-header {
		min-height: 1em;
		background-color: var(--imag-blue-100);
		font-size: 13px;
		display: flex;
		align-items: center;
		position: relative;
	}

	.viz-sub_panel-content {
		height: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: clip;
	}

	.viz-tab-button {
		display: flex;
		align-items: center;
		position: relative;
		padding: 0.3em 0.7em;
		cursor: default;
		height: 100%;

		&:hover {
			background-color: hsl(219 31% 20% / 1);
		}
	}

	:global(
			.splitpanes__pane > *:last-child,
			.viz-sub_panel-content > :first-child:not(.splitpanes--horizontal, .splitpanes--vertical)
		) {
		padding: 0.5em;
	}

	:global(
			.splitpanes__pane
				> :is(.splitpanes, .splitpanes__pane, .viz-sub_panel-content, .splitpanes--horizontal, .splitpanes--vertical)
		) {
		padding: 0em;
	}

	.active-tab {
		box-shadow: 0 -1.5px 0 0 var(--imag-blue-40) inset;
	}

	:global(.drop-hover-above) {
		outline: 1.5px solid var(--imag-outline-colour);
	}
</style>
