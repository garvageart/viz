<script lang="ts">
    import type { SvelteHTMLElements } from "svelte/elements";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { generateRandomString } from "$lib/utils/misc";

    interface Props {
        value?: number;
        min?: number;
        max?: number;
        step?: number;
        label?: string;
        description?: string;
        disabled?: boolean;
        readonly?: boolean;
        compact?: boolean;
        placeholder?: string;
        id?: string;
        name?: string;
        onchange?: (value: number) => void;
        oninput?: (value: number) => void;
    }

    let {
        value = $bindable(1),
        min = 1,
        max = 100,
        step = 1,
        label,
        description,
        disabled = false,
        readonly = false,
        compact = false,
        placeholder,
        id,
        name,
        onchange,
        oninput,
        ...props
    }: Props & Omit<SvelteHTMLElements["div"], "onchange" | "oninput"> = $props();

    const inputId = $derived(id ?? generateRandomString(6));
    let textValue = $state(String(value ?? 1));

    // Synchronize text representation when value prop is updated externally
    $effect(() => {
        if (value !== undefined && Number(textValue) !== value) {
            textValue = String(value);
        }
    });

    function clamp(val: number): number {
        let clamped = val;
        if (min !== undefined && clamped < min) {
            clamped = min;
        }
        if (max !== undefined && clamped > max) {
            clamped = max;
        }
        return clamped;
    }

    function setValue(newVal: number) {
        const clamped = clamp(newVal);
        value = clamped;
        textValue = String(clamped);

        oninput?.(clamped);
        onchange?.(clamped);
    }

    function increment(amount: number = step) {
        if (disabled || readonly) {
            return;
        }

        setValue((value ?? 0) + amount);
    }

    function decrement(amount: number = step) {
        if (disabled || readonly) {
            return;
        }

        setValue((value ?? 0) - amount);
    }

    // Continuous button hold logic
    let holdTimeout: ReturnType<typeof setTimeout> | undefined;
    let holdInterval: ReturnType<typeof setInterval> | undefined;

    function startHold(action: () => void) {
        if (disabled || readonly) {
            return;
        }

        action();
        holdTimeout = setTimeout(() => {
            holdInterval = setInterval(action, 60);
        }, 350);
    }

    function stopHold() {
        if (holdTimeout) {
            clearTimeout(holdTimeout);
            holdTimeout = undefined;
        }

        if (holdInterval) {
            clearInterval(holdInterval);
            holdInterval = undefined;
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (disabled || readonly) {
            return;
        }

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                increment(step);

                break;
            case "ArrowDown":
                e.preventDefault();
                decrement(step);

                break;
            case "PageUp":
                e.preventDefault();
                increment(step * 10);

                break;
            case "PageDown":
                e.preventDefault();
                decrement(step * 10);

                break;
            case "Home":
                if (min !== undefined) {
                    e.preventDefault();
                    setValue(min);
                }

                break;
            case "End":
                if (max !== undefined) {
                    e.preventDefault();
                    setValue(max);
                }

                break;
        }
    }

    function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
        const raw = e.currentTarget.value.trim();
        textValue = raw;

        if (raw === "" || raw === "-") {
            return;
        }

        const parsed = Number(raw);
        if (!isNaN(parsed)) {
            value = parsed;
            oninput?.(parsed);
        }
    }

    function handleBlur() {
        if (textValue === "" || isNaN(Number(textValue))) {
            textValue = String(value ?? min ?? 1);
        } else {
            setValue(Number(textValue));
        }
    }

    const canIncrement = $derived(!disabled && !readonly && (max === undefined || (value ?? 0) < max));
    const canDecrement = $derived(!disabled && !readonly && (min === undefined || (value ?? 0) > min));
</script>

<div class="viz-input-number-wrapper" class:disabled class:compact {...props}>
    {#if label}
        <label for={inputId} class="input-label">
            {label}
        </label>
    {/if}

    <div class="input-number-group">
        <button
            type="button"
            class="stepper-btn decrement-btn"
            disabled={!canDecrement}
            tabindex="-1"
            aria-label="Decrease value"
            aria-controls={inputId}
            onpointerdown={() => startHold(() => decrement(step))}
            onpointerup={stopHold}
            onpointerleave={stopHold}
            onpointercancel={stopHold}
        >
            <MaterialIcon iconName="remove" size={compact ? "1rem" : "1.2rem"} />
        </button>

        <input
            id={inputId}
            {name}
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            role="spinbutton"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-label={label || props["aria-label"] || "Number input"}
            value={textValue}
            {placeholder}
            {disabled}
            {readonly}
            oninput={handleInput}
            onblur={handleBlur}
            onkeydown={handleKeyDown}
            class="input-number-field"
        />

        <button
            type="button"
            class="stepper-btn increment-btn"
            disabled={!canIncrement}
            tabindex="-1"
            aria-label="Increase value"
            aria-controls={inputId}
            onpointerdown={() => startHold(() => increment(step))}
            onpointerup={stopHold}
            onpointerleave={stopHold}
            onpointercancel={stopHold}
        >
            <MaterialIcon iconName="add" size={compact ? "1rem" : "1.2rem"} />
        </button>
    </div>

    {#if description}
        <div class="input-description">{description}</div>
    {/if}
</div>

<style lang="scss">
    .viz-input-number-wrapper {
        display: inline-flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        user-select: none;

        &.disabled {
            opacity: 0.5;

            .input-number-group {
                cursor: not-allowed;
            }
        }
    }

    .input-label {
        font-weight: 500;
        color: var(--viz-text-secondary);
    }

    .input-number-group {
        display: inline-flex;
        align-items: center;
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        overflow: hidden;
        transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;

        &:focus-within {
            border-color: var(--viz-primary);
            box-shadow: 0 0 0 1px var(--viz-primary);
        }
    }

    .input-number-field {
        width: 3rem;
        min-width: 2rem;
        height: 2.2rem;
        padding: 0 var(--viz-spacing-xs);
        border: none;
        background: transparent;
        color: var(--viz-text-primary);
        font-family: var(--viz-mono-font);
        font-weight: 600;
        text-align: center;
        outline: none;

        &::selection {
            background-color: var(--viz-primary);
            color: #ffffff;
        }
    }

    .stepper-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2.2rem;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--viz-text-secondary);
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;

        &:hover:not(:disabled) {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
        }

        &:active:not(:disabled) {
            background-color: var(--viz-surface-hover);
            color: var(--viz-primary);
        }

        &:disabled {
            opacity: 0.35;
            cursor: not-allowed;
        }
    }

    /* Compact Toolbar Variant */
    .viz-input-number-wrapper.compact {
        .input-number-group {
            height: 1.8rem;
        }

        .input-number-field {
            height: 1.8rem;
            width: 2.5rem;
        }

        .stepper-btn {
            width: 1.5rem;
            height: 1.8rem;
        }
    }

    .input-description {
        color: var(--viz-text-muted);
    }
</style>
