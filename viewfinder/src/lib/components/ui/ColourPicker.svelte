<script lang="ts">
    import { ContextKeys } from "#lib/context-keys.js";
    import { Popover } from "bits-ui";
    import { getContext } from "svelte";
    import ColorPicker from "svelte-awesome-color-picker";

    interface Props {
        id?: string;
        hex?: string;
        disabled?: boolean;
        isAlpha?: boolean;
        isTextInput?: boolean;
        class?: string;
        onchange?: (hex: string | null) => void;
    }

    let {
        id,
        hex = $bindable(""),
        disabled = false,
        isAlpha = false,
        isTextInput = false,
        class: className = "",
        onchange
    }: Props = $props();

    let open = $state(false);

    // Read modal z-index from context so popover always appears above modals
    const getModalZIndex = getContext<(() => number) | undefined>(ContextKeys.ModalZIndex);
    const popoverZIndex = $derived(getModalZIndex ? getModalZIndex() + 1 : undefined);

    // Keep internal color representation for color picker canvas
    let internalHex = $derived(hex);

    function handleColorChange(newHex: string | null) {
        if (!newHex) {
            return;
        }

        hex = newHex;
        if (onchange) {
            onchange(newHex);
        }
    }
</script>

<div class="viz-colour-picker-root {className}" class:disabled>
    {#if id}
        <input type="hidden" {id} value={hex} />
    {/if}
    <Popover.Root bind:open>
        <Popover.Trigger class="colour-picker-trigger" {disabled} aria-label="Select colour" title="Select colour">
            {#if hex}
                <span class="colour-swatch" style:background-color={hex}></span>
            {:else}
                <span class="colour-swatch empty" title="No colour selected">
                    <span class="empty-line"></span>
                </span>
            {/if}
        </Popover.Trigger>

        <Popover.Portal>
            <Popover.Content
                side="bottom"
                align="start"
                sideOffset={6}
                class="viz-colour-picker-popover"
                style={popoverZIndex ? `z-index: ${popoverZIndex};` : undefined}
            >
                <div class="popover-inner">
                    <ColorPicker
                        bind:hex={internalHex}
                        isDialog={false}
                        nullable={false}
                        {isAlpha}
                        {isTextInput}
                        texts={{
                            color: { rgb: "RGB", hsv: "HSV", hex: "HEX" },
                            changeTo: ""
                        }}
                        onInput={(color) => {
                            handleColorChange(color.hex);
                        }}
                    />
                </div>
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
</div>

<style lang="scss">
    .viz-colour-picker-root {
        display: inline-flex;
        align-items: center;
        position: relative;

        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }

    :global(.colour-picker-trigger) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        background-color: var(--viz-surface-input);
        cursor: pointer;
        box-sizing: border-box;
        outline: none;

        &:hover:not(:disabled) {
            border-color: var(--viz-border-strong);
            background-color: var(--viz-surface-hover);
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }

    .colour-swatch {
        display: flex;
        width: 100%;
        height: 100%;
        border-radius: var(--viz-border-radius-sm);
        border: var(--viz-border-thin);
        box-sizing: border-box;

        &.empty {
            position: relative;
            background-color: var(--viz-surface-card);
            overflow: hidden;

            .empty-line {
                position: absolute;
                top: 50%;
                left: -20%;
                width: 140%;
                height: 1.5px;
                background-color: var(--viz-error-color);
                transform: rotate(-45deg);
                transform-origin: center;
            }
        }
    }

    :global(.viz-colour-picker-popover) {
        z-index: var(--viz-z-popover);
        background-color: var(--viz-surface-popover);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        padding: var(--viz-padding-sm);
        box-sizing: border-box;
        outline: none;

        /* Map library CSS custom properties to Viz tokens */
        --cp-bg-color: var(--viz-surface-popover);
        --cp-border-color: var(--viz-border-subtle);
        --cp-text-color: var(--viz-text-primary);
        --cp-input-color: var(--viz-surface-input);
        --cp-button-hover-color: var(--viz-surface-hover);
        --focus-color: var(--viz-primary);
        --slider-width: 1rem;

        /* Strip library internal wrapper margins and duplicate border */
        :global(.color-picker .wrapper) {
            border: none;
            padding: 0;
            margin: 0;
            background: transparent;
            box-shadow: none;
            display: grid;
            grid-auto-flow: dense;
            gap: var(--viz-spacing-sm);
            width: auto;
        }

        /* Colour canvas */
        :global(.color-picker .picker) {
            grid-row: 1;
            grid-column: 1;
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-sm);
            overflow: hidden;
            box-sizing: border-box;
        }

        /* Sliders */
        :global(.color-picker .h) {
            grid-row: 1;
            grid-column: 2;
            margin: 0 !important;
            overflow: hidden;
            box-sizing: border-box;
        }

        :global(.color-picker .a) {
            grid-row: 1;
            grid-column: 3;
            margin: 0 !important;
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-sm);
            overflow: hidden;
            box-sizing: border-box;
        }

        /* Text inputs inside popover */
        :global(.color-picker .text-input) {
            grid-row: 2;
            grid-column: 1 / -1;
            margin-top: var(--viz-spacing-xs);
            width: 100%;
        }

        :global(.color-picker .input-container) {
            gap: var(--viz-spacing-xs);
            height: 2rem;
            align-items: stretch;
        }

        :global(.color-picker .input-container input) {
            height: 2rem;
            line-height: 2rem;
            box-sizing: border-box;
            padding: 0 var(--viz-spacing-xs);
            background-color: var(--viz-surface-input);
            color: var(--viz-text-primary);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-sm);
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-sm);
            text-align: center;
            outline: none;

            &:focus-visible {
                border-color: var(--viz-primary);
                box-shadow: 0 0 0 1px var(--viz-primary);
            }
        }

        /* Mode switcher button (HEX / RGB / HSV) */
        :global(.color-picker .text-input button) {
            height: 2rem;
            line-height: 2rem;
            box-sizing: border-box;
            margin-top: var(--viz-spacing-xs);
            background-color: var(--viz-surface-input);
            color: var(--viz-text-secondary);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-sm);
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-sm);
            font-weight: 600;
            text-transform: uppercase;
            cursor: pointer;
            outline: none;

            &:hover {
                background-color: var(--viz-surface-hover);
                color: var(--viz-text-primary);
            }

            &:focus-visible {
                border-color: var(--viz-primary);
                box-shadow: 0 0 0 1px var(--viz-primary);
            }
        }
    }
</style>
