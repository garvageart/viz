<script lang="ts">
    import { modalsManager } from "#lib/components/modals/manager/ModalManager.svelte.ts";
    import Button from "#lib/components/ui/Button.svelte";
    import InputSelect, { type InputOption } from "#lib/components/ui/InputSelect.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";
    import type { Keyword, KeywordUpdate } from "@viz/api";

    interface Props {
        id?: string;
        heading: string;
        data?: Keyword;
        keywords?: Keyword[];
        buttonText: string;
        modalAction: (data: KeywordUpdate) => Promise<void> | void;
    }

    let { data, keywords = [], buttonText, modalAction }: Props = $props();

    let name = $derived(data?.name ?? "");
    let colour = $derived(data?.colour ?? "");
    let parent = $derived(data?.parent ?? "");
    let isSubmitting = $state(false);

    const parentOptions = $derived<InputOption[]>([
        { value: "", label: "None" },
        ...keywords
            .filter((k) => {
                if (data && k.uid === data.uid) {
                    return false;
                }

                return true;
            })
            .map((k) => ({
                value: k.uid,
                label: k.name
            }))
    ]);

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        e.stopPropagation();

        const trimmedName = name.trim();
        if (!trimmedName) {
            return;
        }

        isSubmitting = true;
        try {
            const trimmedColour = colour?.trim();
            await modalAction({
                name: trimmedName,
                colour: trimmedColour ? trimmedColour : undefined,
                parent: parent ? parent : undefined
            });
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div id="viz-keyword-modal">
    <form id="keyword-form" onsubmit={handleSubmit}>
        <InputText
            id="keyword-name"
            name="name"
            label="Name"
            placeholder="Keyword name"
            type="text"
            bind:value={name}
            selectOnFocus={false}
            autofocus
            required
            spellcheck="false"
        />

        <div class="form-field colour-field">
            <span class="field-label">Colour</span>
            <div class="colour-row">
                <input
                    id="keyword-colour-picker"
                    type="color"
                    value={colour}
                    onchange={(e) => {
                        colour = e.currentTarget.value;
                    }}
                    class="colour-picker"
                    aria-label="Select keyword colour"
                />
                <InputText
                    id="keyword-colour-text"
                    name="colour"
                    placeholder="None"
                    bind:value={colour}
                    spellcheck="false"
                    class="colour-text-input"
                />
                {#if colour}
                    <Button
                        variant="ghost"
                        size="small"
                        iconName="close"
                        onclick={() => {
                            colour = "";
                        }}
                        title="Clear colour"
                        aria-label="Clear colour"
                    />
                {/if}
            </div>
        </div>

        <div class="form-field">
            <InputSelect id="keyword-parent" label="Parent Keyword" options={parentOptions} bind:value={parent} />
        </div>

        <div class="form-actions">
            <Button variant="danger" onclick={() => modalsManager.pop()}>
                <span>Cancel</span>
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting || !name.trim()}>
                <span>{buttonText}</span>
            </Button>
        </div>
    </form>
</div>

<style lang="scss">
    #viz-keyword-modal {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
    }

    #keyword-form {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        width: 100%;
    }

    .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        width: 100%;
    }

    .field-label {
        font-weight: 500;
        color: var(--viz-text-secondary);
    }

    .colour-row {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        width: 100%;
    }

    .colour-picker {
        width: 3rem;
        height: 3rem;
        padding: 0;
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        cursor: pointer;
        background: transparent;

        &::-webkit-color-swatch-wrapper {
            padding: 2px;
        }

        &::-webkit-color-swatch {
            border: none;
            border-radius: var(--viz-border-radius-xs);
        }
    }

    :global(.colour-text-input) {
        flex: 1;
    }

    .form-actions {
        margin: var(--viz-spacing-sm) 0;
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
        width: 100%;
    }
</style>
