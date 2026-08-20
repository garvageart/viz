<script lang="ts">
    import { type Snippet } from "svelte";
    import { debugMode } from "$lib/states/index.svelte";

    interface Props {
        children: Snippet;
        onclick?: (
            e: MouseEvent & {
                currentTarget: EventTarget & Window;
            }
        ) => void;
        show: boolean;
        lightboxElement?: HTMLElement | undefined;
        backgroundColour?: string;
        backgroundOpacity?: number;
        zIndex?: number;
        closeOnEsc?: boolean;
    }

    let {
        children,
        onclick,
        show = $bindable(false),
        lightboxElement = $bindable(),
        backgroundColour = "#000000",
        backgroundOpacity = 0.65,
        zIndex = 9998,
        closeOnEsc = true
    }: Props = $props();

    let resolvedBackground = $derived.by(() => {
        if (backgroundOpacity === undefined || backgroundOpacity === null) {
            return backgroundColour;
        }

        const clampedOpacity = Math.max(0, Math.min(1, backgroundOpacity));
        return `color-mix(in srgb, ${backgroundColour} ${clampedOpacity * 100}%, transparent)`;
    });

    if (debugMode) {
        $effect(() => {
            if (show) {
                console.log("lightbox is showing");
            } else {
                console.log("lightbox is not showing");
            }
        });
    }
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.defaultPrevented) {
            return;
        }

        if (e.key === "Escape" && closeOnEsc) {
            show = false;
        }
    }}
    onclick={(e) => {
        if (e.target === lightboxElement) {
            onclick?.(e);
        }
    }}
/>

{#if show}
    <div
        id="viz-lightbox-overlay"
        style:z-index={zIndex}
        style:background-color={resolvedBackground}
        bind:this={lightboxElement}
    >
        {@render children()}
    </div>
{/if}

<style lang="scss">
    #viz-lightbox-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
