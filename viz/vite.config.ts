import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import { fileURLToPath } from 'url';
import devtoolsJson from "vite-plugin-devtools-json";

const file = fileURLToPath(new URL('package.json', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const config = JSON.parse(fs.readFileSync('../config/imagine.json', 'utf8'));
const define = {
	'__APP_VERSION__': JSON.stringify(pkg.version)
};

if (process.env.NODE_ENV !== 'production') {
	(define as any).__servers = config.servers;
}

export default defineConfig({
	plugins: [devtoolsJson(), sveltekit()],
	define: define,
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec.{js,ts}']
				}
			}
		],
	},
	server: {
		port: config.servers.viz.port,
		cors: true
	},
	preview: {
		port: config.servers.viz.port,
		cors: true
	}
});
