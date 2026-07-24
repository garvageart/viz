<script lang="ts">
    import { debugMode } from "$lib/states/index.svelte";

    interface Props {
        children: () => any;
        onclick?: (
            e: MouseEvent & {
                currentTarget: EventTarget & Window;
            }
        ) => void;
        show: boolean;
        lightboxElement?: HTMLElement | undefined;
        backgroundOpacity?: number;
        zIndex?: number;
        closeOnEsc?: boolean;
    }

    let {
        children,
        onclick,
        show = $bindable(false),
        lightboxElement = $bindable(),
        backgroundOpacity = $bindable(0.5),
        zIndex = 9998,
        closeOnEsc = true
    }: Props = $props();

    let lightboxEl: HTMLElement | undefined = $state();

    $effect(() => {
        lightboxElement = lightboxEl;
    });

    $effect(() => {
        if (lightboxEl) {
            lightboxEl.style.backgroundColor = `rgba(0, 0, 0, ${backgroundOpacity})`;
        }
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
        if (e.target === lightboxEl) {
            onclick?.(e);
        }
    }}
/>

{#if show}
    <div id="viz-lightbox-overlay" style:z-index={zIndex} bind:this={lightboxEl}>
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
        background-color: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
