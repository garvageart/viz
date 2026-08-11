<script lang="ts">
    import { DateTime } from "luxon";
    import { onDestroy } from "svelte";

    let now = $state(DateTime.now());

    const interval = setInterval(() => {
        now = DateTime.now();
    }, 1000);

    onDestroy(() => {
        clearInterval(interval);
    });

    let timeString = $derived(now.toLocaleString(DateTime.TIME_WITH_SECONDS));
    let dateString = $derived(now.toLocaleString({ weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    let zoneName = $derived(now.zoneName ?? "Local");
    let offsetString = $derived(now.toFormat("ZZZZ"));
</script>

<div class="clock-panel">
    <time class="clock-time" datetime={now.toISO()}>{timeString}</time>
    <span class="clock-date">{dateString}</span>
    <span class="clock-zone">
        <span class="zone-name">{zoneName}</span>
        <span>—</span>
        <span class="zone-offset">{offsetString}</span>
    </span>
</div>

<style lang="scss">
    .clock-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--viz-spacing-sm);
        text-align: center;
        padding: var(--viz-spacing-std);
        box-sizing: border-box;
        color: var(--viz-text-primary);
    }

    .clock-time {
        font-size: 4rem;
        font-weight: 700;
        line-height: 1;
        font-variant-numeric: tabular-nums;
    }

    .clock-date {
        font-size: var(--viz-font-size-xl);
        font-weight: 500;
        color: var(--viz-text-secondary);
    }

    .clock-zone {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        font-weight: 500;
        color: var(--viz-text-muted);
    }

    .zone-offset {
        text-transform: uppercase;
    }
</style>
