<script lang="ts">
    import type { HistogramChannelData, HistogramStat } from "$lib/third-party/photo-histogram/js/histogram";

    export interface ChannelVisibility {
        red: boolean;
        green: boolean;
        blue: boolean;
        luminance: boolean;
    }

    interface Props {
        hist?: HistogramChannelData;
        max?: HistogramStat;
        channels?: ChannelVisibility;
        bins?: number;
        selection?: { start: number; end: number } | null;
        hoverBin?: number | null;
    }

    let {
        hist,
        max,
        channels = { red: true, green: true, blue: true, luminance: true },
        bins = 256,
        selection = $bindable(null),
        hoverBin = $bindable(null)
    }: Props = $props();

    const VIEW_W = 1000;
    const VIEW_H = 600;

    let svgEl: SVGSVGElement | undefined = $state();
    let isSelecting = $state(false);

    const enabledRgb = $derived([channels.red, channels.green, channels.blue].filter(Boolean).length);
    // A lone RGB channel (no luminance) reads better filled; otherwise RGB curves over a luminance backdrop.
    const rgbAsFill = $derived(enabledRgb === 1 && !channels.luminance);

    const sqrtMax = $derived(max ? Math.sqrt(Math.max(max.red, max.green, max.blue, max.luminance, 1)) : 1);

    function areaPath(arr: number[]): string {
        let d = `M 0 ${VIEW_H}`;
        for (let i = 0; i < bins; i++) {
            const x = (i / (bins - 1)) * VIEW_W;
            const y = VIEW_H - (Math.sqrt(arr[i] ?? 0) / sqrtMax) * VIEW_H;
            d += ` L ${x} ${y}`;
        }
        d += ` L ${VIEW_W} ${VIEW_H} Z`;
        return d;
    }

    function linePath(arr: number[]): string {
        let d = "";
        for (let i = 0; i < bins; i++) {
            const x = (i / (bins - 1)) * VIEW_W;
            const y = VIEW_H - (Math.sqrt(arr[i] ?? 0) / sqrtMax) * VIEW_H;
            d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        return d;
    }

    function binFromPointer(e: PointerEvent): number {
        if (!svgEl) {
            return 0;
        }
        const rect = svgEl.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        return Math.round(frac * (bins - 1));
    }

    function onPointerDown(e: PointerEvent) {
        svgEl?.setPointerCapture(e.pointerId);
        isSelecting = true;
        const bin = binFromPointer(e);
        hoverBin = bin;
        selection = { start: bin, end: bin };
    }

    function onPointerMove(e: PointerEvent) {
        const bin = binFromPointer(e);
        hoverBin = bin;
        if (!isSelecting || !selection) {
            return;
        }
        selection = {
            start: Math.min(selection.start, bin),
            end: Math.max(selection.end, bin)
        };
    }

    function onPointerUp(e: PointerEvent) {
        try {
            svgEl?.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        isSelecting = false;
    }
</script>

<div class="hist-chart">
    <svg
        bind:this={svgEl}
        class="hist-svg"
        viewBox="0 0 {VIEW_W} {VIEW_H}"
        preserveAspectRatio="none"
        role="img"
        aria-label="Image histogram"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointerleave={() => (hoverBin = null)}
    >
        {#each [0.25, 0.5, 0.75] as step}
            <line class="grid" x1={VIEW_W * step} y1="0" x2={VIEW_W * step} y2={VIEW_H} />
            <line class="grid" x1="0" y1={VIEW_H * step} x2={VIEW_W} y2={VIEW_H * step} />
        {/each}

        {#if hist}
            {#if channels.luminance}
                <path class="hist-fill hist-luma" d={areaPath(hist.luminance)} />
            {/if}

            {#if channels.red}
                <path
                    class="hist-red {rgbAsFill ? 'hist-fill' : 'hist-stroke'}"
                    d={rgbAsFill ? areaPath(hist.red) : linePath(hist.red)}
                />
            {/if}
            {#if channels.green}
                <path
                    class="hist-green {rgbAsFill ? 'hist-fill' : 'hist-stroke'}"
                    d={rgbAsFill ? areaPath(hist.green) : linePath(hist.green)}
                />
            {/if}
            {#if channels.blue}
                <path
                    class="hist-blue {rgbAsFill ? 'hist-fill' : 'hist-stroke'}"
                    d={rgbAsFill ? areaPath(hist.blue) : linePath(hist.blue)}
                />
            {/if}
        {/if}

        {#if selection && selection.end > selection.start}
            <rect
                class="hist-selection"
                x={(selection.start / (bins - 1)) * VIEW_W}
                y="0"
                width={((selection.end - selection.start) / (bins - 1)) * VIEW_W}
                height={VIEW_H}
            />
            <line
                class="hist-selection-edge"
                x1={(selection.start / (bins - 1)) * VIEW_W}
                y1="0"
                x2={(selection.start / (bins - 1)) * VIEW_W}
                y2={VIEW_H}
            />
        {/if}

        {#if hoverBin != null}
            <line
                class="hover"
                x1={(hoverBin / (bins - 1)) * VIEW_W}
                y1="0"
                x2={(hoverBin / (bins - 1)) * VIEW_W}
                y2={VIEW_H}
            />
        {/if}
    </svg>
</div>

<style lang="scss">
    .hist-chart {
        width: 100%;
        aspect-ratio: 3 / 2;
        touch-action: none;
        cursor: crosshair;
    }

    .hist-svg {
        display: block;
        width: 100%;
        height: 100%;
        background-color: var(--viz-surface-card);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-sm);
        overflow: hidden;
        user-select: none;
        touch-action: none;
    }

    .grid {
        stroke: var(--viz-border-subtle);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
    }

    .hist-fill {
        opacity: 0.55;
    }

    .hist-luma {
        fill: var(--viz-histogram-luma);
        opacity: 0.18;
    }

    .hist-red {
        fill: var(--viz-histogram-red);
        stroke: var(--viz-histogram-red);
    }

    .hist-green {
        fill: var(--viz-histogram-green);
        stroke: var(--viz-histogram-green);
    }

    .hist-blue {
        fill: var(--viz-histogram-blue);
        stroke: var(--viz-histogram-blue);
    }

    .hist-stroke {
        fill: none;
        stroke-width: 1.5;
        vector-effect: non-scaling-stroke;
        opacity: 0.95;
    }

    .hist-selection {
        fill: color-mix(in srgb, var(--viz-primary) 15%, transparent);
        vector-effect: non-scaling-stroke;
    }

    .hist-selection-edge {
        stroke: var(--viz-accent);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
    }

    .hover {
        stroke: var(--viz-text-muted);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
        opacity: 0.7;
    }
</style>
