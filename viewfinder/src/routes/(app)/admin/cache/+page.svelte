<script lang="ts">
    import { goto, invalidate } from "$app/navigation";
    import { page } from "$app/state";
    import { clearImageCache } from "@viz/api";
    import { DateTime } from "luxon";
    import AdminRouteShell from "#lib/components/admin/AdminRouteShell.svelte";
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import ConfirmationModal from "#lib/components/modals/ConfirmationModal.svelte";
    import Accordion from "#lib/components/ui/Accordion.svelte";
    import { type BadgeVariant } from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import IconBadge, { type IconBadgeVariant } from "#lib/components/ui/IconBadge.svelte";
    import MaterialIcon from "#lib/components/ui/MaterialIcon.svelte";
    import RadioGroup, { type RadioGroupOption } from "#lib/components/ui/RadioGroup.svelte";
    import { type Toast, toasts } from "#lib/toast-notifcations/toasts.svelte.js";
    import type { MaterialSymbol } from "#lib/types/MaterialSymbol.js";
    import { formatBytes } from "#lib/utils/images.js";
    import type { PageData } from "./$types";

    interface Props {
        data: PageData;
    }

    type CacheHealth = "optimal" | "fair" | "poor" | "unknown";
    type ClearMode = "keep-permanent" | "everything";
    type CacheHealthVariant = Extract<BadgeVariant, IconBadgeVariant>;

    const clearOptions: RadioGroupOption[] = [
        {
            value: "keep-permanent",
            label: "Keep permanent transforms",
            description: "Removes generated previews and resized variants. Transforms flagged permanent are preserved."
        },
        {
            value: "everything",
            label: "Remove everything",
            description:
                "Also deletes permanent transforms. Embeds or links relying on them may fail until regenerated."
        }
    ];

    const AUTO_REFRESH_INTERVAL_MS = 30_000;
    const GAUGE_RADIUS = 52;
    const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

    const healthCopy: Record<
        CacheHealth,
        {
            title: string;
            icon: MaterialSymbol;
            variant: CacheHealthVariant;
            message: string;
        }
    > = {
        unknown: {
            title: "Awaiting cache activity",
            icon: "help",
            variant: "neutral",
            message: "No cache requests recorded yet. Metrics appear once transforms are requested."
        },
        optimal: {
            title: "Optimal cache health",
            icon: "check_circle",
            variant: "success",
            message: "Most transforms are served straight from disk, keeping CPU and I/O load low."
        },
        fair: {
            title: "Fair cache health",
            icon: "warning",
            variant: "warning",
            message: "A moderate share of requests miss the cache. Review client thumbnail sizes if latency drifts."
        },
        poor: {
            title: "Poor cache health",
            icon: "error",
            variant: "error",
            message: "Transforms are regenerated frequently. Expect higher latency and CPU load per request."
        }
    };

    let { data }: Props = $props();

    let cacheStatus = $derived(data.cacheStatus);
    let loading = $state(false);
    let refreshing = $state(false);
    let clearMode = $state<ClearMode>("keep-permanent");
    let lastUpdated = $state(new Date());

    let totalRequests = $derived(cacheStatus.hits + cacheStatus.misses);
    let hasRequests = $derived(totalRequests > 0);
    let hitPercent = $derived(cacheStatus.hit_ratio * 100);
    let hitsPercent = $derived(hasRequests ? (cacheStatus.hits / totalRequests) * 100 : 0);
    let gaugePercent = $derived(Math.min(100, Math.max(0, hitPercent)));
    let gaugeDash = $derived(`${(gaugePercent / 100) * GAUGE_CIRCUMFERENCE} ${GAUGE_CIRCUMFERENCE}`);
    let gaugeValue = $derived(hasRequests ? `${hitPercent.toFixed(1)}%` : "—");
    let hitsShare = $derived(hasRequests ? `${hitsPercent.toFixed(1)}%` : "—");
    let missesShare = $derived(hasRequests ? `${(100 - hitsPercent).toFixed(1)}%` : "—");
    let health = $derived<CacheHealth>(
        !hasRequests ? "unknown" : hitPercent >= 80 ? "optimal" : hitPercent >= 50 ? "fair" : "poor"
    );
    let healthInfo = $derived(healthCopy[health]);
    let formattedSize = $derived(formatBytes(cacheStatus.size) ?? "0 B");
    let averageTransform = $derived(
        cacheStatus.items > 0 ? (formatBytes(cacheStatus.size / cacheStatus.items) ?? "—") : "—"
    );

    $effect(() => {
        const interval = setInterval(() => {
            if (document.hidden || loading) {
                return;
            }

            void refreshStats(false);
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => clearInterval(interval);
    });

    async function refreshStats(announce = true) {
        if (announce) {
            refreshing = true;
        }

        try {
            await invalidate(page.route.id ?? page.url.pathname);
            lastUpdated = new Date();

            if (announce) {
                toasts.add({
                    type: "success",
                    message: "Cache statistics refreshed."
                });
            }
        } catch (e) {
            if (announce) {
                toasts.add({
                    type: "error",
                    message: "Failed to refresh cache statistics."
                });
            }
        } finally {
            if (announce) {
                refreshing = false;
            }
        }
    }

    function openClearConfirm() {
        clearMode = "keep-permanent";

        lightboxManager.open(ConfirmationModal, {
            heading: "Clear Image Cache",
            confirmText: "Clear Cache",
            buttonVariant: "danger",
            onConfirm: handleClearCache,
            children: confirmBody
        });
    }

    async function handleClearCache() {
        loading = true;
        const mode = clearMode;

        try {
            const response = await clearImageCache({ keepPermanent: mode === "keep-permanent" });
            if (response.status !== 200) {
                toasts.add({
                    type: "error",
                    message: response.data.error || "Failed to clear image cache."
                });
                return;
            }

            const toastOptions: Partial<Omit<Toast, "id">> = {
                type: "success",
                message:
                    mode === "keep-permanent"
                        ? "Cache cleared. Viz will regenerate previews on demand."
                        : "Cache cleared, including permanent transforms."
            };

            if (mode === "everything") {
                toastOptions.actions = [
                    {
                        label: "Rescan",
                        onClick: () => goto("/admin/jobs")
                    }
                ];
            }

            toasts.add(toastOptions);
            await refreshStats(false);
        } catch (e) {
            toasts.add({
                type: "error",
                message: "Error clearing cache."
            });
        } finally {
            loading = false;
        }
    }
</script>

{#snippet statCard({
    iconName,
    variant,
    label,
    value
}: {
    iconName: MaterialSymbol;
    variant: IconBadgeVariant;
    label: string;
    value: string;
})}
    <div class="stat-card">
        <IconBadge {iconName} {variant} />
        <div class="stat-body">
            <span class="stat-value">{value}</span>
            <span class="stat-label">{label}</span>
        </div>
    </div>
{/snippet}

{#snippet confirmBody()}
    <div class="clear-modal">
        <p class="clear-intro">
            Clearing the cache frees <b>{formattedSize}</b> across
            <b>{cacheStatus.items.toLocaleString()}</b> stored transforms.
        </p>

        <RadioGroup
            bind:value={clearMode}
            name="cache-clear-mode"
            label="Cache clearing scope"
            variant="card"
            options={clearOptions}
        />

        <p class="reset-note">
            <MaterialIcon iconName="restart_alt" size="1rem" />
            Hit and miss counters reset to zero when the cache is cleared.
        </p>

        {#if clearMode === "everything"}
            <p class="mode-warning">
                <MaterialIcon iconName="warning" size="1rem" />
                This cannot be undone. Viz rebuilds transforms on demand, which can cause a temporary load spike.
            </p>
        {/if}
    </div>
{/snippet}

<AdminRouteShell heading="Cache Management" description="Monitor and manage the image processing cache">
    {#snippet actions()}
        <div class="action-group">
            <div class="last-updated">
                <MaterialIcon iconName="sync" size="1rem" class="sync-icon" />
                <span>Updated {DateTime.fromJSDate(lastUpdated).toFormat("HH:mm:ss")}</span>
            </div>
            <Button
                iconName="refresh"
                variant="secondary"
                onclick={() => void refreshStats()}
                disabled={refreshing || loading}
                title="Refresh statistics"
            >
                {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <Button iconName="delete_sweep" variant="danger" onclick={openClearConfirm} disabled={loading}>
                {loading ? "Clearing…" : "Clear Cache"}
            </Button>
        </div>
    {/snippet}

    <div class="cache-dashboard">
        <section class="stat-strip" aria-label="Cache summary">
            {@render statCard({
                iconName: "hard_drive",
                variant: "info",
                label: "Disk footprint",
                value: formattedSize
            })}
            {@render statCard({
                iconName: "photo_library",
                variant: "warning",
                label: "Stored transforms",
                value: cacheStatus.items.toLocaleString()
            })}
            {@render statCard({
                iconName: "query_stats",
                variant: "primary",
                label: "Total requests",
                value: totalRequests.toLocaleString()
            })}
            {@render statCard({
                iconName: "straighten",
                variant: "success",
                label: "Average transform",
                value: averageTransform
            })}
        </section>

        <section class="panel efficiency-panel">
            <header class="panel-header">
                <div class="panel-heading">
                    <IconBadge iconName="speed" variant={healthInfo.variant} size="1.1rem" />
                    <div class="panel-title">
                        <h2>Cache Efficiency</h2>
                        <span class="panel-subtitle">Hit and miss counts since the last cache clear</span>
                    </div>
                </div>
            </header>

            <div class="efficiency-body">
                <div class="gauge">
                    <svg viewBox="0 0 120 120" role="img" aria-label={`Cache hit rate: ${gaugeValue}`}>
                        <circle class="gauge-track" cx="60" cy="60" r={GAUGE_RADIUS} />
                        <circle
                            class="gauge-fill {health}"
                            class:is-empty={!hasRequests}
                            cx="60"
                            cy="60"
                            r={GAUGE_RADIUS}
                            stroke-dasharray={gaugeDash}
                            transform="rotate(-90 60 60)"
                        />
                    </svg>
                    <div class="gauge-centre">
                        <span class="gauge-value">{gaugeValue}</span>
                        <span class="gauge-label">hit rate</span>
                    </div>
                </div>

                <div class="efficiency-breakdown">
                    <div class="breakdown-row">
                        <span class="breakdown-label">
                            <span class="dot hits" aria-hidden="true"></span>
                            Hits
                        </span>
                        <span class="breakdown-value">{cacheStatus.hits.toLocaleString()}</span>
                        <span class="breakdown-percent">{hitsShare}</span>
                    </div>
                    <div class="breakdown-row">
                        <span class="breakdown-label">
                            <span class="dot misses" aria-hidden="true"></span>
                            Misses
                        </span>
                        <span class="breakdown-value">{cacheStatus.misses.toLocaleString()}</span>
                        <span class="breakdown-percent">{missesShare}</span>
                    </div>
                </div>
            </div>

            <div class="health-banner {health}" role="status">
                <IconBadge
                    iconName={healthInfo.icon}
                    variant={healthInfo.variant}
                    size="1.1rem"
                    color={healthInfo.variant === "neutral" ? "var(--viz-text-primary)" : undefined}
                />
                <div class="health-copy">
                    <span class="health-title">{healthInfo.title}</span>
                    <span class="health-message">{healthInfo.message}</span>
                </div>
            </div>
        </section>

        <Accordion variant="bordered" size="large" iconPosition="right" iconType="arrow">
            {#snippet header()}
                <span class="accordion-heading">
                    <MaterialIcon iconName="info" size="1.2rem" />
                    <span>About image caching</span>
                </span>
            {/snippet}

            <div class="accordion-copy">
                <p>
                    Viz uses a non-destructive image transformation model. When clients request resizes, crops, or
                    format upgrades, the original image is left untouched. The processed output — such as a webp preview
                    — is cached here for subsequent requests.
                </p>
                <p>
                    <b>Is it safe to clear?</b> Yes. Clearing the cache instantly frees disk space. Viz regenerates any requested
                    thumbnails or previews on the fly as users navigate the platform, though the first load for each size
                    may see minor latency.
                </p>
            </div>
        </Accordion>
    </div>
</AdminRouteShell>

<style lang="scss">
    .action-group {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
        flex-wrap: wrap;
    }

    .last-updated {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-primary);
        font-family: var(--viz-mono-font);
        letter-spacing: -0.02em;

        :global(.sync-icon) {
            color: var(--viz-primary);
        }
    }

    .cache-dashboard {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
    }

    .stat-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--viz-spacing-md);

        @media (max-width: 900px) {
            grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 480px) {
            grid-template-columns: 1fr;
        }
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-md) var(--viz-spacing-lg);
    }

    .stat-body {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        min-width: 0;
    }

    .stat-value {
        font-size: var(--viz-font-size-xl);
        font-weight: 700;
        font-family: var(--viz-mono-font);
        line-height: 1.2;
        color: var(--viz-text-primary);
    }

    .stat-label {
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
    }

    .panel {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-lg);
        padding: var(--viz-spacing-lg);
    }

    .panel-header {
        display: flex;
        align-items: center;
    }

    .panel-heading {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        min-width: 0;

        h2 {
            margin: 0;
            font-size: var(--viz-font-size-xl);
            font-weight: 600;
            color: var(--viz-text-primary);
        }
    }

    .panel-title {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        min-width: 0;
    }

    .panel-subtitle {
        display: block;
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-secondary);
    }

    .efficiency-body {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xl);
        flex: 1;

        @media (max-width: 640px) {
            flex-direction: column;
            align-items: stretch;
        }
    }

    .gauge {
        position: relative;
        width: 11rem;
        aspect-ratio: 1;
        flex-shrink: 0;

        svg {
            width: 100%;
            height: 100%;
        }

        @media (max-width: 640px) {
            align-self: center;
        }
    }

    .gauge-track,
    .gauge-fill {
        fill: none;
        stroke-width: 10;
    }

    .gauge-track {
        stroke: var(--viz-surface-hover);
    }

    .gauge-fill {
        stroke: var(--viz-primary);
        stroke-linecap: round;
        transition: stroke-dasharray 0.5s ease;

        &.optimal {
            stroke: var(--viz-success-color);
        }

        &.fair {
            stroke: var(--viz-warning-color);
        }

        &.poor {
            stroke: var(--viz-error-color);
        }

        &.unknown {
            stroke: var(--viz-text-muted);
        }

        &.is-empty {
            opacity: 0;
        }
    }

    .gauge-centre {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--viz-spacing-xxs);
        text-align: center;
    }

    .gauge-value {
        font-size: var(--viz-font-size-3xl);
        font-weight: 700;
        font-family: var(--viz-mono-font);
        letter-spacing: -0.04em;
        line-height: 1;
        color: var(--viz-text-primary);
    }

    .gauge-label {
        font-size: var(--viz-font-size-sm);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--viz-text-muted);
    }

    .efficiency-breakdown {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        flex: 1;
        min-width: 0;
    }

    .breakdown-row {
        display: grid;
        grid-template-columns: 1fr auto 4.5rem;
        align-items: center;
        gap: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-lg);
    }

    .breakdown-label {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        color: var(--viz-text-secondary);
        font-weight: 500;
    }

    .dot {
        display: inline-block;
        width: var(--viz-spacing-sm);
        height: var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-pill);
        flex-shrink: 0;

        &.hits {
            background-color: var(--viz-success-color);
        }

        &.misses {
            background-color: var(--viz-warning-color);
        }
    }

    .breakdown-value {
        font-family: var(--viz-mono-font);
        font-weight: 700;
        letter-spacing: -0.04em;
        color: var(--viz-text-primary);
    }

    .breakdown-percent {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-muted);
        text-align: right;
    }

    .health-banner {
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-md);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-md);
        background-color: var(--viz-surface-panel);

        &.optimal {
            border-color: color-mix(in srgb, var(--viz-success-color) 30%, var(--viz-border-subtle));
            background-color: color-mix(in srgb, var(--viz-success-color) 8%, var(--viz-surface-panel));
        }

        &.fair {
            border-color: color-mix(in srgb, var(--viz-warning-color) 30%, var(--viz-border-subtle));
            background-color: color-mix(in srgb, var(--viz-warning-color) 8%, var(--viz-surface-panel));
        }

        &.poor {
            border-color: color-mix(in srgb, var(--viz-error-color) 30%, var(--viz-border-subtle));
            background-color: color-mix(in srgb, var(--viz-error-color) 8%, var(--viz-surface-panel));
        }
    }

    .health-copy {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        min-width: 0;
    }

    .health-title {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        color: var(--viz-text-primary);
    }

    .health-message {
        font-size: var(--viz-font-size-lg);
        line-height: 1.5;
        color: var(--viz-text-secondary);
    }

    .accordion-heading {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        color: var(--viz-text-primary);
    }

    .accordion-copy {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-lg);
        line-height: 1.6;
        color: var(--viz-text-secondary);

        p {
            margin: 0;
        }

        b {
            color: var(--viz-text-primary);
            font-weight: 600;
        }
    }

    .clear-modal {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .clear-intro {
        margin: 0;
        color: var(--viz-text-secondary);
    }

    .reset-note {
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-xs);
        margin: 0;
        color: var(--viz-text-muted);
        font-size: var(--viz-font-size-std);
        line-height: 1.45;
    }

    .mode-warning {
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-xs);
        margin: 0;
        padding: var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-sm);
        background-color: color-mix(in srgb, var(--viz-error-color) 10%, var(--viz-surface-card));
        color: var(--viz-error-color);
        font-size: var(--viz-font-size-std);
        line-height: 1.45;
    }
</style>
