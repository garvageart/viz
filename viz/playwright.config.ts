import { defineConfig ***REMOVED*** from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
***REMOVED***,
	testDir: 'e2e'
***REMOVED******REMOVED***;
