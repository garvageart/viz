<script lang="ts">
    import { goto, invalidate } from "$app/navigation";
    import { page } from "$app/state";
    import { clearImageCache } from "$lib/api";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import ConfirmationModal, { modalOptions } from "$lib/components/modals/ConfirmationModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";
    import IconBadge from "$lib/components/ui/IconBadge.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { type Toast, toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol.js";
    import { formatBytes } from "$lib/utils/images";
    import { invalidateViz } from "$lib/views/views.svelte";

    let { data } = $props();

    let cacheStatus = $derived(data.cacheStatus);
    let loading = $state(false);
    let refreshing = $state(false);
    let keepPermanent = $state(true);

    function openClearConfirm() {
        modalsManager.open(
            ConfirmationModal,
            {
                title: "Clear Image Cache",
                confirmText: "Clear Cache",
                onConfirm: handleClearCache,
                children: confirmBody
            },
            { heading: "Clear Image Cache", ...modalOptions }
        );
    }

    async function handleClearCache() {
        loading = true;

        try {
            const response = await clearImageCache({ keepPermanent });
            if (response.status !== 200) {
                toastState.addToast({
                    type: "error",
                    message: response.data.error || "Failed to clear image cache."
                });
                return;
            }

            const toastOptions: Partial<Omit<Toast, "id">> = {
                type: "success",
                message: "Image cache cleared successfully."
            };

            if (!keepPermanent) {
                toastOptions.actions = [
                    {
                        label: "Rescan",
                        onClick: () => goto("/admin/jobs")
                    }
                ];
            }

            toastState.addToast(toastOptions);
            await invalidateViz();
        } catch (e) {
            toastState.addToast({
                type: "error",
                message: "Error clearing cache."
            });
        } finally {
            loading = false;
        }
    }

    async function handleRefresh() {
        refreshing = true;
        try {
            await invalidate(page.url.pathname);
            toastState.addToast({
                type: "success",
                message: "Cache statistics refreshed."
            });
        } catch (e) {
            toastState.addToast({
                type: "error",
                message: "Failed to refresh cache statistics."
            });
        } finally {
            refreshing = false;
        }
    }
</script>

{#snippet metricCard({
    icon,
    variant,
    title,
    value,
    desc
}: {
    icon: MaterialSymbol;
    variant: "info" | "warning" | "success" | "primary";
    title: string;
    value: string | number;
    desc: string;
})}
    <div class="metric-card">
        <div class="card-header">
            <IconBadge iconName={icon} {variant} size="1.25rem" />
            <span class="card-title">{title}</span>
        </div>
        <div class="card-value">{value}</div>
        <span class="card-desc">{desc}</span>
    </div>
{/snippet}

{#snippet confirmBody()}
    <div
        style="display: flex; flex-direction: column; gap: var(--viz-spacing-md); margin-bottom: var(--viz-spacing-md);"
    >
        <span>Are you sure you want to clear the image cache? This will delete cached transformations.</span>
        <Checkbox label="Keep permanent transforms (thumbnails & previews)" bind:checked={keepPermanent} />
    </div>
{/snippet}

<AdminRouteShell heading="Cache Management" description="Monitor and manage the image processing cache">
    {#snippet actions()}
        <Button variant="small" onclick={handleRefresh} disabled={refreshing || loading} title="Refresh Statistics">
            <MaterialIcon iconName="refresh" class={refreshing ? "spinning" : ""} />
            Refresh
        </Button>
        <Button
            variant="small"
            onclick={openClearConfirm}
            disabled={loading || refreshing}
            hoverColor="var(--viz-alert-color)"
        >
            <MaterialIcon iconName="delete_sweep" />
            {#if loading}
                Clearing...
            {:else}
                Clear Cache
            {/if}
        </Button>
    {/snippet}

    <div class="cache-container">
        <!-- Metrics Cards Grid -->
        <div class="metrics-grid">
            {@render metricCard({
                icon: "folder_special",
                variant: "info",
                title: "Total Size",
                value: formatBytes(cacheStatus.size) ?? "0 B",
                desc: "Total disk footprint of cached image transformations"
            })}

            {@render metricCard({
                icon: "photo_library",
                variant: "warning",
                title: "Cached Items",
                value: cacheStatus.items.toLocaleString(),
                desc: "Count of distinct transformed images currently stored"
            })}

            {@render metricCard({
                icon: "speed",
                variant: "success",
                title: "Cache Hits",
                value: cacheStatus.hits.toLocaleString(),
                desc: "Transform requests served directly from local cache"
            })}

            {@render metricCard({
                icon: "trending_up",
                variant: "primary",
                title: "Hit Ratio",
                value: `${(cacheStatus.hit_ratio * 100).toFixed(2)}%`,
                desc: "Efficiency of cache serving requests without re-processing"
            })}
        </div>

        <!-- Details & Visualization Section -->
        <div class="details-section">
            <!-- Efficiency Gauge/Bar -->
            <div class="visualization-card">
                <div class="section-title">
                    <MaterialIcon iconName="analytics" />
                    <h3>Cache Efficiency Ratio</h3>
                </div>

                <div class="efficiency-bar-container">
                    <div
                        class="bar-fill hits"
                        style="width: {cacheStatus.hit_ratio * 100}%"
                        title="Hits: {(cacheStatus.hit_ratio * 100).toFixed(2)}%"
                    ></div>
                    <div
                        class="bar-fill misses"
                        style="width: {(1 - cacheStatus.hit_ratio) * 100}%"
                        title="Misses: {((1 - cacheStatus.hit_ratio) * 100).toFixed(2)}%"
                    ></div>
                </div>

                <div class="efficiency-legend">
                    <div class="legend-item">
                        <span class="dot hits"></span>
                        <span class="legend-label">Hits:</span>
                        <span class="legend-val">{cacheStatus.hits.toLocaleString()} requests</span>
                    </div>
                    <div class="legend-item">
                        <span class="dot misses"></span>
                        <span class="legend-label">Misses:</span>
                        <span class="legend-val">{cacheStatus.misses.toLocaleString()} requests</span>
                    </div>
                </div>

                <div
                    class="efficiency-status"
                    class:healthy={cacheStatus.hit_ratio >= 0.8}
                    class:warning={cacheStatus.hit_ratio < 0.8 && cacheStatus.hit_ratio >= 0.5}
                    class:critical={cacheStatus.hit_ratio < 0.5}
                >
                    <MaterialIcon
                        iconName={cacheStatus.hit_ratio >= 0.8
                            ? "check_circle"
                            : cacheStatus.hit_ratio >= 0.5
                              ? "warning"
                              : "error"}
                    />
                    <span>
                        {#if cacheStatus.hit_ratio >= 0.8}
                            Cache health is <b>Optimal</b>. High hit ratio minimizes CPU/GPU load.
                        {:else if cacheStatus.hit_ratio >= 0.5}
                            Cache health is <b>Acceptable</b>. Consider monitor/window optimization sizing.
                        {:else}
                            Cache health is <b>Sub-optimal</b>. High miss rate increases image-generation latency.
                        {/if}
                    </span>
                </div>
            </div>

            <!-- Advisory Information Panel -->
            <div class="advisory-card">
                <div class="section-title">
                    <MaterialIcon iconName="info" />
                    <h3>About Image Caching</h3>
                </div>
                <div class="advisory-content">
                    <span>
                        Viz utilizes a non-destructive image transformation model. When clients request resizes, crops,
                        or format upgrades, the original image is left completely unmodified. The processed output (e.g.
                        webp preview) is cached here for subsequent requests.
                    </span>
                    <span>
                        <b>Is it safe to clear?</b> Yes. Clearing the cache will instantly free up disk space. Viz will automatically
                        re-generate any requested thumbnails or previews on-the-fly as users navigate the platform, though
                        the first load for each size may experience minor latency.
                    </span>
                </div>
            </div>
        </div>
    </div>
</AdminRouteShell>

<style lang="scss">
    .cache-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
        margin: 0 auto;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--viz-spacing-std);
    }

    .metric-card {
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-lg);
        display: flex;
        flex-direction: column;

        .card-header {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            margin-bottom: var(--viz-spacing-sm);
        }

        .card-title {
            font-size: var(--viz-font-size-lg);
            color: var(--viz-text-secondary);
            font-weight: 500;
        }

        .card-value {
            font-size: var(--viz-font-size-2xl);
            font-weight: 700;
            font-family: var(--viz-mono-font);
            margin: var(--viz-spacing-xs) 0;
            color: var(--viz-text-primary);
        }

        .card-desc {
            display: block;
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-muted);
            margin: var(--viz-spacing-xs) 0 0 0;
            line-height: 1.4;
        }
    }

    .details-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
        gap: var(--viz-spacing-xl);
    }

    .visualization-card,
    .advisory-card {
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xl);
        display: flex;
        flex-direction: column;

        .section-title {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            margin-bottom: var(--viz-spacing-lg);
            border-bottom: var(--viz-border-thin);
            padding-bottom: var(--viz-spacing-sm);

            h3 {
                font-size: var(--viz-font-size-xl);
                font-weight: 600;
                margin: 0;
            }
        }
    }

    .efficiency-bar-container {
        display: flex;
        height: var(--viz-spacing-std);
        width: 100%;
        background-color: var(--viz-surface-panel);
        border-radius: var(--viz-border-radius-pill);
        overflow: hidden;
        margin-bottom: var(--viz-spacing-lg);
    }

    .bar-fill {
        height: 100%;
        transition: width 0.3s ease;

        &.hits {
            background-color: var(--viz-success-color);
        }

        &.misses {
            background-color: var(--viz-warning-color);
        }
    }

    .efficiency-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-lg);
        margin-bottom: var(--viz-spacing-lg);
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        font-size: var(--viz-font-size-lg);

        .dot {
            width: var(--viz-spacing-sm);
            height: var(--viz-spacing-sm);
            border-radius: var(--viz-border-radius-pill);

            &.hits {
                background-color: var(--viz-success-color);
            }

            &.misses {
                background-color: var(--viz-warning-color);
            }
        }

        .legend-label {
            color: var(--viz-text-secondary);
        }

        .legend-val {
            font-weight: 600;
            font-family: var(--viz-mono-font);
        }
    }

    .efficiency-status {
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-md);
        font-size: var(--viz-font-size-lg);
        line-height: 1.5;

        &.healthy {
            background-color: color-mix(in srgb, var(--viz-success-color) 12%, var(--viz-surface-card));
            border: 1px solid color-mix(in srgb, var(--viz-success-color) 25%, var(--viz-border-subtle));
            color: var(--viz-text-primary);
        }

        &.warning {
            background-color: color-mix(in srgb, var(--viz-warning-color) 12%, var(--viz-surface-card));
            border: 1px solid color-mix(in srgb, var(--viz-warning-color) 25%, var(--viz-border-subtle));
            color: var(--viz-text-primary);
        }

        &.critical {
            background-color: color-mix(in srgb, var(--viz-error-color) 12%, var(--viz-surface-card));
            border: 1px solid color-mix(in srgb, var(--viz-error-color) 25%, var(--viz-border-subtle));
            color: var(--viz-text-primary);
        }
    }

    .advisory-content {
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-secondary);
        line-height: 1.6;

        span {
            display: block;
            margin: 0 0 var(--viz-spacing-md) 0;

            &:last-child {
                margin-bottom: 0;
            }
        }

        b {
            color: var(--viz-text-primary);
            font-weight: 600;
        }
    }

    :global(.spinning) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
