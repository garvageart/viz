import '@testing-library/jest-dom/vitest';
import { vi ***REMOVED*** from 'vitest';

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	enumerable: true,
	value: vi.fn(***REMOVED***.mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(***REMOVED***,
		removeEventListener: vi.fn(***REMOVED***,
		dispatchEvent: vi.fn(***REMOVED***,
***REMOVED******REMOVED******REMOVED***,
***REMOVED******REMOVED***

// add more mocks here if you need them
