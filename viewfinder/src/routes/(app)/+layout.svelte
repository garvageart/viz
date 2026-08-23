<script lang="ts">
    import "$lib/components/panels/viz-panel.scss";
    import Header from "$lib/components/ui/Header.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import DownloadPanel from "$lib/components/ui/panels/DownloadPanel.svelte";
    import UploadPanel from "$lib/components/ui/panels/UploadPanel.svelte";
    import { download, isMobile, upload } from "$lib/states/index.svelte";

    let { children } = $props();

    // Pull-to-refresh
    let pullDistance = $state(0);
    let isRefreshing = $state(false);
    let isSpringingBack = $state(false);
    let touchStartY = 0;
    let layoutEl: HTMLElement | undefined = $state();
    const THRESHOLD = 45;
    const MAX_PULL = 60;

    function isScrolledAtTop(e: TouchEvent): boolean {
        let node: HTMLElement | null = e.target as HTMLElement;
        while (node && node !== layoutEl) {
            if (node.scrollHeight > node.clientHeight && node.scrollTop > 0) {
                return false;
            }
            node = node.parentElement;
        }

        return true;
    }

    function onPtrTouchStart(e: TouchEvent) {
        if (isRefreshing || !layoutEl) {
            return;
        }

        touchStartY = e.touches[0].clientY;
    }

    function onPtrTouchMove(e: TouchEvent) {
        if (isRefreshing || touchStartY === 0 || !layoutEl) {
            return;
        }

        if (!isScrolledAtTop(e)) {
            return;
        }

        const delta = e.touches[0].clientY - touchStartY;
        if (delta > 0) {
            pullDistance = Math.min(delta, MAX_PULL);
            e.preventDefault();
        }
    }

    function onPtrTouchEnd() {
        if (pullDistance >= THRESHOLD && !isRefreshing) {
            isRefreshing = true;
            window.location.reload();
            return;
        }

        if (pullDistance > 0) {
            isSpringingBack = true;
            pullDistance = 0;
        }

        touchStartY = 0;
    }

    function onPtrTransitionEnd() {
        isSpringingBack = false;
    }
</script>

<div
    class="viz-app-layout"
    bind:this={layoutEl}
    role="presentation"
    ontouchstart={isMobile ? onPtrTouchStart : undefined}
    ontouchmove={isMobile ? onPtrTouchMove : undefined}
    ontouchend={isMobile ? onPtrTouchEnd : undefined}
>
    <Header />
    <!-- TODO: needs more work -->
    {#if isMobile && (pullDistance > 0 || isRefreshing || isSpringingBack)}
        <div
            class="ptr-indicator"
            style:transform="translateY({pullDistance - 48}px)"
            ontransitionend={onPtrTransitionEnd}
            role="presentation"
        >
            <LoadingSpinner color="var(--viz-accent)" size="standard" />
        </div>
    {/if}
    <main id="main" class="viz-content" tabindex="-1">
        {@render children()}
    </main>
    {#if upload.files.length > 0}
        <UploadPanel />
    {/if}
    {#if download.files.length > 0}
        <DownloadPanel />
    {/if}
</div>

<style lang="scss">
    .viz-app-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        position: relative;
    }

    .viz-content {
        display: flex;
        flex: 1;
        overflow: hidden;
        width: 100%;
        position: relative;
    }

    .ptr-indicator {
        background-color: var(--viz-surface-popover);
        border-radius: var(--viz-border-radius-pill);
        position: absolute;
        top: var(--viz-header-height);
        left: 50%;
        margin-left: -1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        z-index: 1000;
        pointer-events: none;
        transition: transform 0.25s cubic-bezier(0, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
</style>
