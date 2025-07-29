<script lang="ts">
	import type { SvelteHTMLElements } from "svelte/elements";
	interface Props {
		label?: string;
	}

	let { value = $bindable(), label, ...props }: Props & SvelteHTMLElements["input"] = $props();
</script>

<input
	{...props}
	type={props.type ?? "text"}
	placeholder={label ?? props.placeholder}
	{value}
	oninput={(e) => {
		value = e.currentTarget.value;
		props.oninput?.(e);
	}}
	onchange={(e) => {
		value = e.currentTarget.value;
		props.onchange?.(e);
	}}
/>

<style lang="scss">
	input:not([type="submit"]) {
		width: 100%;
		max-width: 100%;
		min-height: 2.5rem;
		color: var(--imag-text-color);
		background-color: var(--imag-bg-color);
		outline: none;
		border: none;
		box-shadow: 0 -1px 0 var(--imag-60) inset;
		font-family: var(--imag-font-family);
		font-size: 1rem;
		padding: 0.5rem 2rem;
		margin-bottom: 1rem;

		&::placeholder {
			color: var(--imag-40);
			font-family: var(--imag-font-family);
		}

		&:focus::placeholder {
			color: var(--imag-60);
		}

		&:focus {
			box-shadow: 0 -2px 0 var(--imag-primary) inset;
		}

		&:-webkit-autofill,
		&:-webkit-autofill:focus,
		&:autofill,
		&:autofill:focus {
			font-size: 1rem;
			-webkit-text-size-adjust: 1.5rem;
			-webkit-text-fill-color: var(--imag-text-color);
			-webkit-box-shadow: 0 0 0px 1000px var(--imag-100) inset;
			-webkit-box-shadow: 0 -5px 0 var(--imag-primary) inset;
			transition:
				background-color 0s 600000s,
				color 0s 600000s !important;
		}
	}
</style>
