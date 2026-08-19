<script lang="ts">
    import InputText from "$lib/components/ui/InputText.svelte";

    interface Props {
        value?: string;
        placeholder?: string;
        isEditing?: boolean;
        editable?: boolean;
        disabled?: boolean;
        class?: string;
        inputClass?: string;
        textClass?: string;
        spellcheck?: boolean;
        saveOnBlur?: boolean;
        onsave?: (value: string) => void | Promise<void>;
        oncancel?: () => void;
    }

    let {
        value = $bindable(""),
        isEditing = $bindable(false),
        placeholder = "",
        editable = true,
        disabled = false,
        class: className = "",
        inputClass = "",
        textClass = "",
        spellcheck = false,
        saveOnBlur = true,
        onsave,
        oncancel
    }: Props = $props();

    let editValue = $state("");
    let isSaving = $state(false);

    export function startEditing() {
        if (!editable || disabled || isSaving) {
            return;
        }

        editValue = value ?? "";
        isEditing = true;
    }

    export async function save() {
        if (!isEditing || isSaving) {
            return;
        }

        const trimmed = editValue.trim();
        const prevValue = value ?? "";

        isEditing = false;

        if (trimmed !== prevValue) {
            value = trimmed;
            try {
                isSaving = true;
                await onsave?.(trimmed);
            } finally {
                isSaving = false;
            }
        }
    }

    export function cancel() {
        if (isSaving) {
            return;
        }

        isEditing = false;
        editValue = value ?? "";
        oncancel?.();
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement)?.blur();

            if (!saveOnBlur) {
                save();
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    }

    function handleDisplayKeyDown(e: KeyboardEvent) {
        if (!editable || disabled) {
            return;
        }

        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEditing();
        }
    }
</script>

<div
    class="editable-text-container {className}"
    class:editing={isEditing}
    class:disabled
    class:not-editable={!editable}
>
    {#if isEditing}
        <InputText
            bind:value={editValue}
            class="editable-text-input {inputClass}"
            {spellcheck}
            autofocus={true}
            {disabled}
            onblur={() => {
                if (saveOnBlur) {
                    save();
                }
            }}
            onkeydown={handleKeyDown}
        />
    {:else if editable && !disabled}
        <div
            class="editable-text-display {textClass}"
            class:placeholder={!value}
            role="button"
            tabindex="0"
            title={value || placeholder}
            onclick={startEditing}
            onkeydown={handleDisplayKeyDown}
        >
            {value || placeholder}
        </div>
    {:else}
        <div class="editable-text-display {textClass}" class:placeholder={!value} title={value || placeholder}>
            {value || placeholder}
        </div>
    {/if}
</div>

<style lang="scss">
    .editable-text-container {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        width: 100%;
        position: relative;
        transition: box-shadow 0.15s ease;
        box-shadow: inset 0 -1px 0 0 transparent;

        &.disabled {
            opacity: 0.6;
            pointer-events: none;
        }

        &:not(.not-editable):not(.disabled):not(.editing):hover {
            box-shadow: inset 0 -1px 0 0 var(--viz-primary);
        }

        &.editing {
            box-shadow: inset 0 -1px 0 0 var(--viz-primary);
        }

        :global(.input-container) {
            flex: 1 1 auto;
            min-width: 0;
            width: 100%;
            padding: 0;
            gap: 0;
        }

        :global(input:not([type="submit"])) {
            width: 100%;
            min-width: 0;
            min-height: 0;
            height: auto;
            padding: 0;
            margin: 0;
            border: none;
            outline: none;
            background-color: transparent;
            box-shadow: none;
        }
    }

    .editable-text-display {
        width: 100%;
        min-width: 0;
        padding: 0;
        margin: 0;
        user-select: text;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.placeholder {
            color: var(--viz-text-muted);
            font-style: italic;
        }
    }

    div[role="button"].editable-text-display {
        cursor: pointer;

        &:focus-visible {
            outline: 2px solid var(--viz-primary);
            outline-offset: 2px;
        }
    }
</style>
