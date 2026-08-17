<script lang="ts">
    import type { User } from "@viz/api";
    import { user as userState } from "$lib/states/index.svelte";

    interface Props {
        user?: User;
        size?: string;
        fontSize?: string;
        class?: string;
        showCurrentUser?: boolean;
    }

    let {
        user = userState.data,
        size = "2.2rem",
        fontSize,
        class: className = "",
        showCurrentUser = false
    }: Props = $props();

    let userData = $derived(userState.data);

    let name = $derived(user?.name);
    let isCurrentUser = $derived(userData?.uid === user?.uid);
    let initial = $derived(name && name.trim().length > 0 ? name.trim()[0].toUpperCase() : "?");
</script>

<div
    class="viz-avatar-badge {className}"
    class:current-user={showCurrentUser && isCurrentUser}
    role="img"
    aria-label={name}
    style:width={size}
    style:height={size}
    style:font-size={fontSize || `calc(${size} * 0.45)`}
>
    <span>{initial}</span>
</div>

<style lang="scss">
    .viz-avatar-badge {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background-color: var(--viz-surface-card);
        border: 1px solid var(--viz-border-subtle);
        color: var(--viz-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: var(--viz-font-size-2xl);
        flex-shrink: 0;
        box-sizing: border-box;
        user-select: none;

        &.current-user {
            outline: 2px solid var(--viz-primary);
            outline-offset: 1px;
        }
    }
</style>
