<script lang="ts">
    import type { SvelteHTMLElements } from "svelte/elements";
    import MaterialIcon from "./MaterialIcon.svelte";

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

<div class="search-input" class:has-focus={searchInputHasFocus} {...props}>
    <button
        class="search-button"
        aria-label="Search"
        aria-disabled={loading}
        aria-pressed={loading}
        title="Search"
        onclick={performSearch}
        onkeydown={handleSearch}
        disabled={loading}
    >
        <MaterialIcon iconName="search" size="1.2rem" />
    </button>
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
        <button
            class="clear-search-button"
            type="button"
            aria-label="Clear Search"
            title="Clear Search"
            aria-disabled={loading}
            aria-pressed={loading}
            disabled={loading}
            onclick={() => (value = "")}
        >
            <MaterialIcon iconName="close" size="0.95rem" />
        </button>
    {/if}
</div>

<style lang="scss">
    .search-input {
        display: flex;
        align-items: center;
        width: 20%;
        height: 1.8rem;
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-pill);
        background-color: var(--viz-surface-base);
        overflow: hidden;
        box-sizing: border-box;
    }

    .search-button {
        background-color: var(--viz-primary);
        border: none;
        border-radius: var(--viz-border-radius-pill);
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        height: 100%;
        padding: 0 var(--viz-spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        cursor: pointer;
        transition: background-color 150ms ease;

        &:focus {
            box-shadow: 0px 0px 0px 1.5px inset var(--viz-border-subtle);
            outline: none;
            background-color: var(--viz-primary-hover, var(--viz-primary));
        }

        &:hover {
            background-color: var(--viz-primary-hover, var(--viz-primary));
        }

        &:active {
            background-color: var(--viz-primary-active, var(--viz-primary));
        }
    }

    .search-input__field {
        font-size: var(--viz-font-size-std);
        background-color: var(--viz-surface-base);
        color: var(--viz-text-primary);
        outline: none;
        border: none;
        width: 100%;
        height: 100%;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        padding: 0 var(--viz-spacing-sm);
        font-family: var(--viz-display-font);

        &::placeholder {
            color: var(--viz-text-secondary);
            font-family: var(--viz-display-font);
        }

        &:focus::placeholder {
            color: var(--viz-text-primary);
        }
    }

    .has-focus {
        outline: 1.5px solid var(--viz-secondary);
        outline-offset: -1px;
    }

    @media (max-width: 40rem) {
        .search-input {
            width: 100%;
        }
    }

    .clear-search-button {
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
