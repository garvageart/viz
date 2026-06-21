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
        <MaterialIcon iconName="search" size="0.95rem" style="color: var(--viz-40);" />
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
        height: 1.625rem; /* Dynamic density height for 2rem high header */
        border: 1px solid var(--viz-60);
        border-radius: var(--viz-border-radius-pill);
        background-color: var(--viz-bg-color);
        overflow: hidden;
        box-sizing: border-box;
    }

    .search-button {
        background-color: var(--viz-90);
        border: none;
        border-radius: var(--viz-border-radius-pill);
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        height: 100%;
        padding: 0 var(--viz-spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-text-color);
        cursor: pointer;
        transition: background-color 150ms ease;

        &:focus {
            box-shadow: 0px 0px 0px 1.5px inset var(--viz-60);
            outline: none;
            background-color: var(--viz-80);
        }

        &:hover {
            background-color: var(--viz-80);
        }

        &:active {
            background-color: var(--viz-90);
        }
    }

    .search-input__field {
        font-size: var(--viz-font-size-xs);
        background-color: var(--viz-bg-color);
        color: var(--viz-text-color);
        outline: none;
        border: none;
        width: 100%;
        height: 100%;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        padding: 0 var(--viz-spacing-sm);
        font-family: var(--viz-display-font);

        &::placeholder {
            color: var(--viz-40);
            font-family: var(--viz-display-font);
        }

        &:focus::placeholder {
            color: var(--viz-text-color);
        }
    }

    .has-focus {
        outline: 1.5px solid var(--viz-primary);
        outline-offset: -1px;
    }

    .clear-search-button {
        border: none;
        outline: none;
        height: 100%;
        padding: 0 var(--viz-spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-40);
        cursor: pointer;
        background-color: transparent;
        transition: color 150ms ease;

        &:hover {
            color: var(--viz-text-color);
        }
    }
</style>
