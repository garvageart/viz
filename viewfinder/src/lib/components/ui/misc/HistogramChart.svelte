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
    const PADDING_TOP = 8;
    const BASELINE_Y = VIEW_H - 1;
    const USABLE_HEIGHT = BASELINE_Y - PADDING_TOP;

    let svgEl: SVGSVGElement | undefined = $state();
    let isSelecting = $state(false);

    const sqrtMax = $derived(max ? Math.sqrt(Math.max(max.red, max.green, max.blue, max.luminance, 1)) * 1.04 : 1);

    interface Point {
        x: number;
        y: number;
    }

    function getPoints(arr: number[]): Point[] {
        const pts: Point[] = [];
        const smoothed = new Array(bins);

        // 3-point weighted kernel to smooth bin quantization
        for (let i = 0; i < bins; i++) {
            const prev = arr[Math.max(0, i - 1)] ?? 0;
            const curr = arr[i] ?? 0;
            const next = arr[Math.min(bins - 1, i + 1)] ?? 0;
            smoothed[i] = prev * 0.2 + curr * 0.6 + next * 0.2;
        }

        for (let i = 0; i < bins; i++) {
            const x = (i / (bins - 1)) * VIEW_W;
            const val = smoothed[i] ?? 0;
            const y = BASELINE_Y - (Math.sqrt(val) / sqrtMax) * USABLE_HEIGHT;
            pts.push({
                x,
                y: Math.max(PADDING_TOP, Math.min(BASELINE_Y, y))
            });
        }
        return pts;
    }

    function smoothLinePath(pts: Point[]): string {
        if (pts.length === 0) {
            return "";
        }

        if (pts.length === 1) {
            return `M ${pts[0].x} ${pts[0].y}`;
        }

        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(pts.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = Math.max(PADDING_TOP, Math.min(BASELINE_Y, p1.y + (p2.y - p0.y) / 6));
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = Math.max(PADDING_TOP, Math.min(BASELINE_Y, p2.y - (p3.y - p1.y) / 6));

            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
        return d;
    }

    function smoothAreaPath(pts: Point[]): string {
        if (pts.length === 0) {
            return "";
        }

        const lineD = smoothLinePath(pts);
        const lastX = pts[pts.length - 1].x.toFixed(1);
        const firstX = pts[0].x.toFixed(1);
        return `${lineD} L ${lastX} ${BASELINE_Y} L ${firstX} ${BASELINE_Y} Z`;
    }

    let redPoints = $derived(hist?.red ? getPoints(hist.red) : []);
    let greenPoints = $derived(hist?.green ? getPoints(hist.green) : []);
    let bluePoints = $derived(hist?.blue ? getPoints(hist.blue) : []);
    let lumaPoints = $derived(hist?.luminance ? getPoints(hist.luminance) : []);

    let redLine = $derived(smoothLinePath(redPoints));
    let greenLine = $derived(smoothLinePath(greenPoints));
    let blueLine = $derived(smoothLinePath(bluePoints));
    let lumaLine = $derived(smoothLinePath(lumaPoints));
    let lumaArea = $derived(smoothAreaPath(lumaPoints));

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
            <g class="hist-channels">
                {#if channels.luminance && lumaArea}
                    <path class="hist-area hist-luma-fill" d={lumaArea} />
                {/if}
            </g>

            <g class="hist-lines">
                {#if channels.luminance && lumaLine}
                    <path class="hist-line hist-line-luma" d={lumaLine} />
                {/if}
                {#if channels.blue && blueLine}
                    <path class="hist-line hist-line-blue" d={blueLine} />
                {/if}
                {#if channels.green && greenLine}
                    <path class="hist-line hist-line-green" d={greenLine} />
                {/if}
                {#if channels.red && redLine}
                    <path class="hist-line hist-line-red" d={redLine} />
                {/if}
            </g>
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
        background-color: var(--viz-histogram-bg);
        border: 1px solid var(--viz-histogram-border);
        border-radius: 2px;
        overflow: hidden;
        user-select: none;
        touch-action: none;
    }

    .grid {
        stroke: var(--viz-histogram-grid);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
    }

    .hist-channels {
        pointer-events: none;
    }

    .hist-area {
        vector-effect: non-scaling-stroke;
    }

    .hist-luma-fill {
        fill: var(--viz-histogram-luma);
    }

    .hist-lines {
        pointer-events: none;
    }

    .hist-line {
        fill: none;
        stroke-width: 1.25;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;

        &-red {
            stroke: var(--viz-histogram-red-stroke);
        }

        &-green {
            stroke: var(--viz-histogram-green-stroke);
        }

        &-blue {
            stroke: var(--viz-histogram-blue-stroke);
        }

        &-luma {
            stroke: var(--viz-histogram-luma-stroke);
            opacity: 0.85;
        }
    }

    .hist-selection {
        fill: rgba(255, 255, 255, 0.08);
        vector-effect: non-scaling-stroke;
    }

    .hist-selection-edge {
        stroke: rgba(255, 255, 255, 0.25);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
    }

    .hover {
        stroke: rgba(255, 255, 255, 0.6);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
    }
</style>
