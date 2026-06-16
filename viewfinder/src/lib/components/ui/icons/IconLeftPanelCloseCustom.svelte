<script lang="ts">
    interface Props {
        size?: string;
        class?: string;
    }

    let { size = "1.5em", class: className = "" }: Props = $props();
</script>

<svg
    class="custom-panel-icon {className}"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
>
    <!-- Outer window outline with rounded corners -->
    <rect x="3" y="3" width="18" height="18" rx="4.5" />
    <!-- Left vertical line representing the sidebar (shifted left for more space) -->
    <line x1="8" y1="3" x2="8" y2="21" />
    <!-- Left-pointing chevron (shifted right for more space) -->
    <path d="M16 9l-3 3 3 3" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
