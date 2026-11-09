<script lang="ts">
    import type { SvelteHTMLElements } from "svelte/elements";
    import { generateRandomString } from "#lib/utils/misc.js";

    interface Props {
        label?: string;
        description?: string;
        disabled?: boolean;
        focused?: boolean;
        element?: HTMLInputElement | undefined;
        selectOnFocus?: boolean;
    }

    let {
        value = $bindable(),
        focused = $bindable(),
        label,
        description,
        disabled = false,
        selectOnFocus = true,
        element = $bindable(),
        ...props
    }: Props & SvelteHTMLElements["input"] = $props();

    const inputId = $derived(props.id ?? generateRandomString(6));
    $effect(() => {
        if (element && focused) {
            element.focus();
            if (selectOnFocus) {
                element.select();
            } else if (element.value) {
                const len = element.value.length;
                element.setSelectionRange(len, len);
            }
        }
    });
</script>

<div class="input-container" class:disabled>
    {#if label}
        <label for={inputId} class="input-label"
            >{label}
            {#if props.required}
                <span class="required-asterisk">*</span>
            {/if}
        </label>
    {/if}
    <input
        {...props}
        id={inputId}
        name={props.name}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        bind:this={element}
        bind:value
        {disabled}
        oninput={(e) => {
            props.oninput?.(e);
        }}
        onchange={(e) => {
            props.onchange?.(e);
        }}
        onfocus={(e) => {
            focused = true;
            props.onfocus?.(e);
        }}
        onblur={(e) => {
            focused = false;
            props.onblur?.(e);
        }}
    />
    {#if description}
        <div class="input-description">{description}</div>
    {/if}
</div>

<style lang="scss">
    .input-container {
        display: flex;
        flex-direction: column;
        min-width: 0%;
        position: relative;
        width: 100%;
        gap: 0.5rem;

        &.disabled {
            opacity: 0.5;

            input {
                cursor: not-allowed;
            }
        }
    }

    .input-label {
        font-weight: 500;
        color: var(--viz-text-secondary);

        .required-asterisk {
            color: var(--viz-error-color);
            margin-left: var(--viz-spacing-xxs);
        }
    }

    .input-description {
        color: var(--viz-text-muted);
        padding-left: 0.5rem;
    }

    input:not([type="submit"]) {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        min-height: 2rem;
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-panel);
        outline: none;
        border: none;
        box-shadow: 0 -1px 0 var(--viz-border-subtle) inset;
        font-family: var(--viz-display-font);
        padding: 0.5rem 1rem;
        margin-bottom: 0;

        &::placeholder {
            font-family: var(--viz-display-font);
        }

        &:focus {
            box-shadow: 0 -2px 0 var(--viz-primary) inset;
        }

        &:focus {
            background-color: var(--viz-surface-panel);
            box-shadow: 0 -2px 0 var(--viz-primary) inset;
        }

        &:-webkit-autofill,
        &:-webkit-autofill:focus {
            -webkit-text-fill-color: var(--viz-text-primary);
            -webkit-box-shadow: 0 0 0px 1000px var(--viz-surface-panel) inset;
            -webkit-box-shadow: 0 -5px 0 var(--viz-primary) inset;
            transition:
                background-color 0s 600000s,
                color 0s 600000s !important;
        }
    }
</style>
