<script lang="ts">
    interface Props {
        token: string;
        value?: string;
        onclick?: () => void;
        title?: string;
    }

    let { token, value, onclick, title }: Props = $props();
</script>

<button type="button" class="token-chip-btn" {onclick} title={title ?? `Click to insert {{${token}}}`}>
    <span class="token-code">{token}</span>
    {#if value}
        <span class="token-val">{value}</span>
    {/if}
</button>

<style lang="scss">
    .token-chip-btn {
        background-color: var(--viz-100);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        cursor: pointer;
        text-align: left;
        transition:
            border-color 0.15s ease,
            background-color 0.15s ease;
        outline: none;

        &:hover {
            border-color: var(--viz-primary);
            background-color: var(--viz-80);
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-100),
                0 0 0 4px var(--viz-primary);
        }

        .token-code {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-std);
            font-weight: 600;
            color: var(--viz-text-color);
            background-color: var(--viz-95);
            padding: 1px 3px;
            border-radius: var(--viz-border-radius-sm);
            border: 1px solid var(--viz-60);
        }

        .token-val {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }
    }
</style>
