<script lang="ts">
    import { LabelColours } from "#lib/images/constants.js";
    import { positionDropdown } from "#lib/utils/positioning.js";

    interface Props {
        label: LabelColours | null;
        onSelect?: (label: LabelColours | null) => void;
        variant?: "expanded" | "compact";
        enableSelection?: boolean;
        /**
         * Optional clipping boundary for the popover. When omitted, the nearest
         * clipping/scrollable ancestor is used, falling back to the window.
         */
        boundary?: HTMLElement | null;
    }

    let { label = $bindable(), onSelect, variant = "expanded", enableSelection = true, boundary }: Props = $props();

    let isOpen = $state(false);
    let popoverContainer = $state<HTMLElement>();
    let popoverEl = $state<HTMLElement>();
    let triggerButton = $state<HTMLButtonElement>();

    const popoverPosition = $derived.by(() => {
        if (!isOpen || !popoverEl || !triggerButton) {
            return { left: -9999, top: -9999, ready: false };
        }

        const { left, top } = positionDropdown(popoverEl, triggerButton, boundary);
        return { left, top, ready: true };
    });

    function handleSelect(newLabel: LabelColours | null) {
        if (!enableSelection) {
            return;
        }

        label = newLabel;
        onSelect?.(newLabel);
    }

    function handleClickOutside(event: MouseEvent) {
        if (isOpen && popoverContainer && !popoverContainer.contains(event.target as Node)) {
            isOpen = false;
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

{#snippet noneButton()}
    <span class="none-line"> </span>
{/snippet}

{#if variant === "expanded"}
    <div class="label-selector-container">
        {#each Object.entries(LabelColours) as [name, colour]}
            <button
                class="label-selector"
                title={name}
                style="background-color: {colour};"
                class:selected={label === colour}
                disabled={!enableSelection}
                onclick={() => {
                    if (label === colour) {
                        handleSelect(null);
                    } else {
                        handleSelect(colour);
                    }
                }}
                type="button"
            >
                {#if name === "None"}
                    {@render noneButton()}
                {/if}
            </button>
        {/each}
    </div>
{:else if variant === "compact"}
    {#if enableSelection}
        <div class="label-selector-container" class:compact={variant === "compact"}>
            <div class="compact-container" bind:this={popoverContainer}>
                <button
                    class="label-selector-trigger"
                    class:disable-select={!enableSelection}
                    style={!label ? "" : `background-color: ${label};`}
                    onclick={() => {
                        if (enableSelection) {
                            isOpen = !isOpen;
                        }
                    }}
                    disabled={!enableSelection}
                    title="Select Label"
                    type="button"
                    bind:this={triggerButton}
                >
                    {#if !label}
                        {@render noneButton()}
                    {/if}
                </button>
                {#if isOpen}
                    <div
                        class="label-popover"
                        bind:this={popoverEl}
                        style:top="{popoverPosition.top}px"
                        style:left="{popoverPosition.left}px"
                        style:visibility={popoverPosition.ready ? "visible" : "hidden"}
                    >
                        {#each Object.entries(LabelColours) as [name, colour]}
                            <button
                                class="label-selector"
                                title={name}
                                style="background-color: {colour};"
                                class:selected={label === colour}
                                onclick={() => {
                                    if (label === colour) {
                                        handleSelect(null);
                                    } else {
                                        handleSelect(colour as LabelColours);
                                    }
                                }}
                                type="button"
                            >
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
{/if}

<style lang="scss">
    .compact-container {
        position: relative;
        display: inline-flex;
    }

    .label-selector-container {
        display: flex;
        gap: var(--viz-spacing-sm);

        &.compact {
            gap: 0em;
        }
    }

    .label-selector {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: clip;
        gap: var(--viz-spacing-sm);
        width: var(--viz-font-size-std);
        height: var(--viz-font-size-std);
        border: 1px solid var(--viz-border-subtle);
        background-color: var(--viz-surface-base);
        color: var(--viz-text-primary);
        cursor: pointer;
        padding: 0;

        &:disabled {
            opacity: 1;
        }

        &.selected {
            outline: 1.5px solid var(--viz-primary);
            outline-offset: 0.5px;
        }
    }

    .disable-select {
        cursor: not-allowed;
        pointer-events: none;
    }

    .none-line {
        width: 2px;
        height: 150%;
        background-color: red;
        rotate: -45deg;
    }

    .label-selector-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: clip;
        gap: var(--viz-spacing-sm);
        width: var(--viz-font-size-std);
        height: var(--viz-font-size-std);
        border: 1px solid var(--viz-border-subtle);
        background-color: var(--viz-surface-base);
        color: var(--viz-text-primary);
        cursor: pointer;
        padding: 0;

        &:disabled {
            opacity: 1;
        }

        &:focus-visible {
            outline: 1.5px solid var(--viz-primary);
            border-color: var(--viz-primary);
        }
    }

    .label-popover {
        position: fixed;
        z-index: 1000;
        background-color: var(--viz-surface-base);
        border: 1px solid var(--viz-border-subtle);
        padding: var(--viz-spacing-sm);
        display: flex;
        gap: var(--viz-spacing-sm);
        width: max-content;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        border-radius: 0.25rem;
    }

    @media (max-width: 40rem) {
        .label-selector-container {
            gap: 0.25em;
        }
    }
</style>
