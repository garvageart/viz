import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess ***REMOVED*** from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit'***REMOVED***.Config***REMOVED*** */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(***REMOVED***,

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(***REMOVED***
***REMOVED***
***REMOVED***;

export default config;
