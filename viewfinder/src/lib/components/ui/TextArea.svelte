<script lang="ts">
    import type { FormEventHandler, SvelteHTMLElements } from "svelte/elements";
    import { generateRandomString } from "$lib/utils/misc";

    type TextAreaResize = "none" | "both" | "horizontal" | "vertical";

    interface Props {
        label?: string;
        description?: string;
        disabled?: boolean;
        resize?: TextAreaResize;
        rows?: number;
        minHeight?: string;
        maxHeight?: string;
        autoGrow?: boolean;
    }

    let {
        value = $bindable(),
        label,
        description,
        disabled = false,
        resize = "none",
        rows = 3,
        minHeight = "4rem",
        maxHeight = "24rem",
        autoGrow = false,
        ...props
    }: Props & SvelteHTMLElements["textarea"] = $props();

    const fallbackId = generateRandomString(6);
    const inputId = $derived(props.id ?? fallbackId);

    let textareaEl = $state<HTMLTextAreaElement | undefined>();

    const parseStyleNumber = (raw: string) => {
        if (raw === "none") {
            return;
        }

        // eslint-disable-next-line unicorn/prefer-number-coercion
        const value = Number.parseFloat(raw);
        if (Number.isNaN(value)) {
            return;
        }

        return value;
    };

    const autosize = (element: HTMLTextAreaElement | undefined) => {
        if (!element || !autoGrow || element.scrollHeight === 0) {
            return;
        }

        element.style.minHeight = "0";
        element.style.height = "auto";

        const style = getComputedStyle(element);
        const borderTopWidth = parseStyleNumber(style.borderTopWidth) ?? 0;
        const borderBottomWidth = parseStyleNumber(style.borderBottomWidth) ?? 0;
        const height = element.scrollHeight + borderTopWidth + borderBottomWidth;

        element.style.height = `${height}px`;

        // Show scrollbar only if there is a max-height and content exceeds it
        const maxHeight = parseStyleNumber(style.maxHeight);
        const hasMaxHeight = maxHeight !== undefined;
        element.style.overflow = hasMaxHeight && height > maxHeight ? "auto" : "hidden";
    };

    $effect(() => {
        void value;
        autosize(textareaEl);
    });

    const handleInput: FormEventHandler<HTMLTextAreaElement> = (e) => {
        props.oninput?.(e);
        autosize(textareaEl);
    };
</script>

<div class="textarea-container" class:disabled>
    {#if label}
        <label for={inputId} class="textarea-label"
            >{label}
            {#if props.required}
                <span class="required-asterisk">*</span>
            {/if}
        </label>
    {/if}
    <textarea
        {...props}
        id={inputId}
        name={props.name}
        placeholder={props.placeholder}
        {rows}
        bind:this={textareaEl}
        bind:value
        {disabled}
        style:--textarea-resize={autoGrow ? "none" : resize}
        style:--textarea-min-height={minHeight}
        style:--textarea-max-height={maxHeight}
        oninput={handleInput}
        onchange={(e) => {
            props.onchange?.(e);
        }}
        onfocus={(e) => {
            props.onfocus?.(e);
        }}
        onblur={(e) => {
            props.onblur?.(e);
        }}></textarea>
    {#if description}
        <div class="textarea-description">{description}</div>
    {/if}
</div>

<style lang="scss">
    .textarea-container {
        display: flex;
        flex-direction: column;
        min-width: 0%;
        position: relative;
        width: 100%;
        gap: 0.5rem;

        &.disabled {
            opacity: 0.5;

            textarea {
                cursor: not-allowed;
            }
        }
    }

    .textarea-label {
        font-weight: 500;
        color: var(--viz-text-secondary);

        .required-asterisk {
            color: var(--viz-error-color);
            margin-left: var(--viz-spacing-xxs);
        }
    }

    .textarea-description {
        color: var(--viz-text-muted);
        padding-left: 0.5rem;
    }

    textarea {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        min-height: var(--textarea-min-height);
        max-height: var(--textarea-max-height);
        resize: var(--textarea-resize);
        overflow-y: auto;
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-panel);
        outline: none;
        border: none;
        box-shadow: 0 -1px 0 var(--viz-border-subtle) inset;
        font-family: var(--viz-display-font);
        line-height: 1.5;
        padding: 0.5rem 1rem;
        margin-bottom: 0;

        &::placeholder {
            opacity: 0.7;
            font-family: var(--viz-display-font);
        }

        &:focus::placeholder {
            color: var(--viz-border-subtle);
            opacity: 1;
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
