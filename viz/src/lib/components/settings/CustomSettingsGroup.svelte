<script lang="ts">
	import type { Snippet } from "svelte";

    interface Props {
        title: string;
        description?: string;
        children: Snippet;
        actions?: Snippet;
    }

    let { title, description, children, actions }: Props = $props();
</script>

<div class="settings-group">
	<header>
		<div>
			<h2>{title}</h2>
			{#if description}
				<p class="group-description">{description}</p>
			{/if}
		</div>

        {#if actions}
            <div class="actions">
                {@render actions()}
            </div>
        {/if}
	</header>

	<div class="settings-content">
        {@render children()}
    </div>
</div>

<style lang="scss">
	.settings-group {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
        width: 100%;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--imag-80);

		h2 {
			font-size: 1.5rem;
			font-weight: 600;
			color: var(--imag-text-color);
			margin: 0 0 0.5rem 0;
		}

		.group-description {
			color: var(--imag-40);
			margin: 0;
		}
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

    .settings-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
