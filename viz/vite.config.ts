import { svelteTesting ***REMOVED*** from '@testing-library/svelte/vite';
import { sveltekit ***REMOVED*** from '@sveltejs/kit/vite';
import { defineConfig ***REMOVED*** from 'vite';

export default defineConfig({
	plugins: [sveltekit(***REMOVED***],
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting(***REMOVED***],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec***REMOVED***.{js,ts***REMOVED***'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
			***REMOVED***
	***REMOVED***
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec***REMOVED***.{js,ts***REMOVED***'],
					exclude: ['src/**/*.svelte.{test,spec***REMOVED***.{js,ts***REMOVED***']
			***REMOVED***
		***REMOVED***
		]
***REMOVED***
***REMOVED******REMOVED***;
