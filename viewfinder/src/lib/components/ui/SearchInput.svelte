<script lang="ts">
    import type { SvelteHTMLElements } from "svelte/elements";
    import Button from "$lib/components/ui/Button.svelte";

    interface Props {
        inputId: string;
        loading?: boolean;
        value: string;
        element?: HTMLInputElement;
        placeholder?: string;
        searchInputHasFocus?: boolean;
        performSearch?: (e: KeyboardEvent | MouseEvent) => void;
    }

    let {
        loading = $bindable(false),
        value = $bindable(),
        element = $bindable(),
        placeholder = "Search",
        searchInputHasFocus = $bindable(),
        performSearch,
        inputId,
        ...props
    }: Props & SvelteHTMLElements["div"] = $props();

    function handleSearch(e: KeyboardEvent) {
        e.key === "Enter" && performSearch?.(e);
    }
</script>

<div class="search-input" class:has-focus={searchInputHasFocus} class:has-value={value} {...props}>
    <Button
        iconName="search"
        variant="primary"
        iconSize="1rem"
        class="search-button"
        aria-label="Search"
        aria-disabled={loading}
        aria-pressed={loading}
        title="Search"
        onclick={performSearch}
        onkeydown={handleSearch}
        disabled={loading}
    />
    <input
        id={inputId}
        type="search"
        class="search-input__field"
        {placeholder}
        aria-label="Search"
        aria-disabled={loading}
        disabled={loading}
        onkeydown={handleSearch}
        onfocus={() => (searchInputHasFocus = true)}
        onblur={() => (searchInputHasFocus = false)}
        bind:value
        bind:this={element}
    />
    {#if value}
        <Button
            iconName="close"
            iconSize="1rem"
            class="clear-search-button"
            type="button"
            aria-label="Clear Search"
            title="Clear Search"
            aria-disabled={loading}
            aria-pressed={loading}
            disabled={loading}
            onclick={() => (value = "")}
        />
    {/if}
</div>

<style lang="scss">
    .search-input {
        display: flex;
        align-items: center;
        width: 20%;
        background-color: transparent;
        overflow: hidden;
        box-sizing: border-box;
        padding: var(--viz-spacing-xs);
        box-shadow: var(--viz-border-subtle) 0px 1px;

        &:focus {
            border-radius: var(--viz-border-radius-pill);
            outline: 1.5px solid var(--viz-primary);
        }

        &.has-focus {
            box-shadow: var(--viz-primary) 0px 1px;
        }

        &.has-value {
            box-shadow: var(--viz-primary) 0px 2px;
        }
    }

    .search-button {
        background-color: var(--viz-primary);
        border: none;
        border-radius: var(--viz-border-radius-pill);
        height: 100%;
        padding: 0 var(--viz-spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 150ms ease;

        &:focus {
            outline: none;
            background-color: var(--viz-primary-hover);
        }

        &:hover {
            background-color: var(--viz-primary-hover);
        }

        &:active {
            background-color: var(--viz-primary-active);
        }
    }

    .search-input__field {
        background-color: transparent;
        color: var(--viz-text-primary);
        outline: none;
        border: none;
        width: 100%;
        height: 100%;
        padding: 0 var(--viz-spacing-sm);
        font-size: var(--viz-font-size-std);
        font-family: var(--viz-display-font);

        &:focus {
            font-weight: 500;
        }

        &::placeholder {
            color: var(--viz-text-secondary);
            font-family: var(--viz-display-font);
        }

        &:focus::placeholder {
            color: var(--viz-text-primary);
        }
    }

    @media (max-width: 40rem) {
        .search-input {
            width: 100%;
        }
    }

    :global(.clear-search-button) {
        border: none;
        outline: none;
        height: 100%;
        padding: 0 var(--viz-spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-text-secondary);
        cursor: pointer;
        background-color: transparent;
        transition: color 150ms ease;

        &:hover {
            color: var(--viz-text-primary);
        }
    }
</style>
