<script lang="ts">
	import { generateRandomString } from "$lib/utils/misc";
	import type { SvelteHTMLElements } from "svelte/elements";
	import MaterialIcon from "./MaterialIcon.svelte";

	interface Props {
		label?: string;
		description?: string;
		disabled?: boolean;
		focused?: boolean;
	}

	let {
		value = $bindable(),
		focused = $bindable(),
		label,
		description,
		disabled = false,
		...props
	}: Props & SvelteHTMLElements["input"] = $props();

	const inputId = $derived(props.id ?? generateRandomString(6));
	let inputEl = $state<HTMLInputElement | undefined>();
	let showPassword = $state(false);

	$effect(() => {
		if (inputEl && focused) {
			inputEl.focus();
			inputEl.select();
		}
	});
</script>

<div class="input-container" class:disabled>
	{#if label}
		<label for={inputId} class="input-label">
			{label}
			{#if props.required}
				<span class="required-asterisk">*</span>
			{/if}
		</label>
	{/if}
	<div class="input-wrapper">
		<input
			{...props}
			id={inputId}
			name={props.name}
			type={showPassword ? "text" : "password"}
			placeholder={props.placeholder}
			bind:this={inputEl}
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
		<button
			type="button"
			class="password-toggle-btn"
			onclick={() => (showPassword = !showPassword)}
			{disabled}
			title={showPassword ? "Hide password" : "Show password"}
			aria-label={showPassword ? "Hide password" : "Show password"}
			tabindex="-1"
		>
			<MaterialIcon
				iconName={showPassword ? "visibility_off" : "visibility"}
				size="1.1rem"
				iconStyle="sharp"
			/>
		</button>
	</div>
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
		gap: var(--viz-spacing-sm); // UI Spacing Token
	}

	.input-wrapper {
		position: relative;
		width: 100%;
	}

	.input-label {
		font-size: var(--viz-font-size-sm); // UI Typography Token
		font-weight: 500;
		color: var(--viz-40);
	}

	.required-asterisk {
		color: var(--viz-error-color);
		margin-left: var(--viz-spacing-xxs); // UI Spacing Token
	}

	.input-description {
		font-size: var(--viz-font-size-xs); // UI Typography Token
		color: var(--viz-60);
		padding-left: var(--viz-spacing-sm); // UI Spacing Token
	}

	input {
		width: 100%;
		max-width: 100%;
		min-height: 2.5rem; // Standard density height
		color: var(--viz-text-color);
		background-color: var(--viz-100);
		outline: none;
		border: none;
		box-shadow: 0 -1px 0 var(--viz-60) inset;
		font-family: var(--viz-display-font);
		font-size: 1rem;
		padding: var(--viz-spacing-sm) 2.5rem var(--viz-spacing-sm) var(--viz-spacing-std); // UI Padding Tokens
		margin-bottom: 0;

		&::placeholder {
			color: var(--viz-40);
			font-family: var(--viz-display-font);
		}

		&:focus::placeholder {
			color: var(--viz-60);
			opacity: 1;
		}

		&:focus {
			background-color: var(--viz-100);
			box-shadow: 0 -2px 0 var(--viz-primary) inset;
		}

		&:-webkit-autofill,
		&:-webkit-autofill:focus {
			-webkit-text-fill-color: var(--viz-text-color);
			-webkit-box-shadow: 0 0 0px 1000px var(--viz-100) inset;
			-webkit-box-shadow: 0 -5px 0 var(--viz-primary) inset;
			transition:
				background-color 0s 600000s,
				color 0s 600000s !important;
		}
	}

	.password-toggle-btn {
		position: absolute;
		right: var(--viz-spacing-md); // UI Spacing Token
		top: 50%;
		transform: translateY(-50%);
		background-color: transparent;
		border: none;
		color: var(--viz-40);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		opacity: 0.7;
		transition: color 150ms ease, opacity 150ms ease;
		padding: 0;
		margin: 0;
		outline: none;
		z-index: 3;

		&:hover:not(:disabled) {
			color: var(--viz-text-color);
			opacity: 1;
		}

		&:focus-visible {
			outline: 2px solid var(--viz-primary);
			border-radius: var(--viz-border-radius-sm);
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.3;
		}
	}
</style>
