<script lang="ts">
    import { type ImageAsset } from "$lib/api";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import HistogramChart, { type ChannelVisibility } from "$lib/components/ui/misc/HistogramChart.svelte";
    import { computeForAsset, computeHistogram } from "$lib/histogram";
    import type { HistogramChannels } from "$lib/histogram/types";
    import { selectionManager } from "$lib/states/selection.svelte";
    import type { HistogramData } from "$lib/third-party/photo-histogram/js/histogram";
    import { formatMegapixels, isAssetImage } from "$lib/utils/images";

    interface Props {
        /** Optional direct image element source */
        src?: HTMLImageElement;
        /** Bindable selection range, forwarded to/from the chart. */
        selection?: { start: number; end: number } | null;
    }

    let { src, selection = $bindable(null) }: Props = $props();

    let activeScope = $derived(selectionManager.activeScope);
    let activeItem = $derived(activeScope?.active as ImageAsset | undefined);

    let channels = $state<ChannelVisibility>({ red: true, green: true, blue: true, luminance: true });
    let hoverBin = $state<number | null>(null);

    const BINS = 256;

    const CHANNEL_OPTIONS: { key: keyof ChannelVisibility; label: string }[] = [
        { key: "red", label: "R" },
        { key: "green", label: "G" },
        { key: "blue", label: "B" },
        { key: "luminance", label: "L" }
    ];

    const dotClassFor = (key: keyof ChannelVisibility): string => (key === "luminance" ? "dot-luma" : `dot-${key}`);

    const rgbEnabledCount = $derived([channels.red, channels.green, channels.blue].filter(Boolean).length);

    // Channel used for the stats: a lone RGB channel, otherwise luminance.
    let activeChannel = $derived.by<Exclude<HistogramChannels, "all">>(() => {
        if (rgbEnabledCount === 1 && !channels.luminance) {
            return channels.red ? "red" : channels.green ? "green" : "blue";
        }

        return "luminance";
    });

    let range = $derived(selection ? `${selection.start}–${selection.end}` : `0–${BINS - 1}`);

    interface RangeStats {
        count: number;
        percent: number;
        mean: number;
        median: number;
        stddev: number;
    }

    function computeRangeStats(channel: number[], total: number, start: number, end: number): RangeStats {
        let count = 0;
        let sum = 0;
        let sumSq = 0;

        for (let i = start; i <= end; i++) {
            const c = channel[i] ?? 0;
            count += c;
            sum += c * i;
            sumSq += c * i * i;
        }

        const mean = count ? sum / count : 0;
        const variance = count ? sumSq / count - mean * mean : 0;

        let median = 0;
        if (count) {
            let half = Math.floor(count / 2);
            let acc = 0;

            for (let i = start; i <= end; i++) {
                acc += channel[i] ?? 0;
                if (acc >= half) {
                    median = i;
                    break;
                }
            }
        }

        return {
            count,
            percent: (count / (total || 1)) * 100,
            mean,
            median,
            stddev: Math.sqrt(Math.max(0, variance))
        };
    }

    function statsFor(data: HistogramData | null): RangeStats | null {
        if (!data) {
            return null;
        }

        const start = selection?.start ?? 0;
        const end = selection?.end ?? BINS - 1;
        return computeRangeStats(data.hist[activeChannel], data.count[activeChannel], start, end);
    }

    function clippingFor(data: HistogramData | null) {
        if (!data) {
            return null;
        }

        const channel = data.hist[activeChannel];
        const total = data.count[activeChannel] || 1;
        return {
            shadows: (channel[0] / total) * 100,
            highlights: (channel[255] / total) * 100
        };
    }

    function hoverInfoFor(data: HistogramData | null) {
        if (!data || hoverBin == null) {
            return null;
        }
        return {
            tone: Math.round((hoverBin / (BINS - 1)) * 255),
            count: data.hist[activeChannel][hoverBin] ?? 0
        };
    }

    function resetCanvas() {
        channels = { red: true, green: true, blue: true, luminance: true };
        selection = null;
        hoverBin = null;
    }

    // Purely derived: swaps to the right computation whenever the source changes.
    // Only images (with image_paths) produce a histogram; a selected collection
    // has no image source and falls through to the empty state.
    let histogramPromise = $derived.by(async () => {
        if (src) {
            return computeHistogram(src);
        }

        if (!isAssetImage(activeItem)) {
            return null;
        }

        return computeForAsset(activeItem);
    });

    let data = $derived(await histogramPromise);

    let stats = $derived(statsFor(data));
    let hover = $derived(hoverInfoFor(data));
    let clipping = $derived(clippingFor(data));
    let totalPixels = $derived(
        data
            ? activeItem?.width && activeItem?.height
                ? activeItem.width * activeItem.height
                : data.count[activeChannel]
            : 0
    );
    let displayPixels = $derived(stats ? Math.round(totalPixels * (stats.percent / 100)) : 0);
</script>

<div class="histogram-container">
    <div class="channel-chips" role="group" aria-label="Channels">
        {#each CHANNEL_OPTIONS as opt (opt.key)}
            <button
                type="button"
                class="chip"
                class:active={channels[opt.key]}
                aria-pressed={channels[opt.key]}
                onclick={() => (channels[opt.key] = !channels[opt.key])}
            >
                <span class="dot {dotClassFor(opt.key)}"></span>{opt.label}
            </button>
        {/each}

        <Button iconName="refresh" onclick={resetCanvas} title="Reset Histogram" size="small" class="reset-btn" />
    </div>

    <div class="chart-area">
        {#if hover}
            <div class="hover-readout">Tone {hover.tone} / {BINS - 1} · {hover.count.toLocaleString()} px</div>
        {/if}
        <HistogramChart hist={data?.hist} max={data?.max} {channels} bind:selection bind:hoverBin />
    </div>

    {#if stats}
        <div class="pixels" title={`${displayPixels.toLocaleString()} pixels in range ${range}`}>
            <span class="pixels-label">Pixels</span>
            <span class="pixels-value">{formatMegapixels(displayPixels, 1)} MP ({stats.percent.toFixed(2)}%)</span>
        </div>
    {/if}

    {#snippet statRow(label: string, value: string, tooltip?: string)}
        <div class="stat-row" title={tooltip ?? value}>
            <span class="stat-label">{label}</span>
            <span class="stat-val">{value}</span>
        </div>
    {/snippet}

    <div class="stats">
        <div class="stat-group">
            <h4 class="stat-group-title">Selection</h4>
            <div class="stat-rows">
                {@render statRow("Range", range)}
            </div>
        </div>

        {#if stats}
            <div class="stat-group">
                <h4 class="stat-group-title">Distribution</h4>
                <div class="stat-rows">
                    {@render statRow("Mean", stats.mean.toFixed(2), `Mean: ${stats.mean.toFixed(2)}`)}
                    {@render statRow("Median", stats.median.toString(), `Median: ${stats.median}`)}
                    {@render statRow("Std Dev", stats.stddev.toFixed(2), `Std Dev: ${stats.stddev.toFixed(2)}`)}
                </div>
            </div>
        {/if}
    </div>

    {#if clipping && (clipping.shadows > 0.1 || clipping.highlights > 0.1)}
        <div class="clipping-badges">
            {#if clipping.shadows > 0.1}
                <Badge variant="warning" title="Pixels fully black in this channel">
                    <span>Shadows {clipping.shadows.toFixed(2)}%</span>
                </Badge>
            {/if}
            {#if clipping.highlights > 0.1}
                <Badge variant="warning" title="Pixels fully white in this channel">
                    <span>Highlights {clipping.highlights.toFixed(2)}%</span>
                </Badge>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .histogram-container {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        height: 100%;
        padding: var(--viz-spacing-std);
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-base);
        font-size: var(--viz-font-size-std);
        gap: var(--viz-spacing-std);
        overflow-y: auto;
        overflow-x: hidden;
    }

    .channel-chips {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        flex-shrink: 0;

        :global(.reset-btn) {
            margin-left: auto;
        }
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-pill);
        background-color: var(--viz-surface-panel);
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;

        &:hover {
            background-color: var(--viz-surface-hover);
        }

        &.active {
            border-color: var(--viz-primary);
            color: var(--viz-text-primary);
        }
    }

    .dot {
        width: 0.6rem;
        height: 0.6rem;
        border-radius: 50%;
        flex-shrink: 0;

        &-red {
            background-color: var(--viz-histogram-red);
        }

        &-green {
            background-color: var(--viz-histogram-green);
        }

        &-blue {
            background-color: var(--viz-histogram-blue);
        }

        &-luma {
            background-color: var(--viz-histogram-luma);
        }
    }

    .chart-area {
        position: relative;
        flex-shrink: 0;
    }

    .state-box {
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 3 / 2;
        border: 1px solid var(--viz-border-subtle);
        color: var(--viz-text-muted);
        text-align: center;
        padding: var(--viz-spacing-std);
        box-sizing: border-box;
        flex-shrink: 0;

        &.error {
            color: var(--viz-error-color);
        }
    }

    /* Overlaid on the chart so showing it never shifts the layout. */
    .hover-readout {
        position: absolute;
        top: var(--viz-spacing-xs);
        left: 50%;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 2;
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-sm);
        color: var(--viz-text-secondary);
        background-color: var(--viz-surface-popover);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
        border: var(--viz-border-thin);
        white-space: nowrap;
    }

    .pixels {
        display: flex;
        justify-content: center;
        align-items: baseline;
        gap: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-std);
        font-weight: 600;
        flex-shrink: 0;

        .pixels-label {
            color: var(--viz-text-secondary);
        }

        .pixels-value {
            color: var(--viz-text-primary);
            white-space: nowrap;
        }
    }

    .stats {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-std);
        width: 100%;
        font-family: var(--viz-mono-font);
        flex-shrink: 0;

        .stat-group {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xs);
            min-width: 0;

            .stat-group-title {
                margin: 0;
                font-family: var(--viz-display-font);
                font-weight: 600;
                color: var(--viz-text-primary);
            }

            .stat-rows {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: var(--viz-spacing-xs) var(--viz-spacing-std);

                .stat-row {
                    display: inline-flex;
                    align-items: baseline;
                    gap: var(--viz-spacing-sm);
                    white-space: nowrap;

                    .stat-label {
                        color: var(--viz-text-secondary);
                    }

                    .stat-val {
                        color: var(--viz-text-primary);
                    }
                }
            }
        }
    }

    .clipping-badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-xs);
        flex-shrink: 0;
    }
</style>
