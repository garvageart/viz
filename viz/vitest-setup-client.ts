import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Note: When using the 'client' workspace (jsdom) most of these globals
// already exist. We guard each polyfill so we do NOT overwrite jsdom's
// real implementations — we only provide fallbacks when running in
// non-jsdom/node-based test projects.

// matchMedia (jsdom doesn't implement fully in some versions)
if (typeof globalThis.matchMedia === 'undefined') {
	Object.defineProperty(globalThis, 'matchMedia', {
		writable: true,
		enumerable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
} else {
	// if present, ensure the instance has the common functions
	try {
		const mm = globalThis.matchMedia as any;
		if (typeof mm.addEventListener === 'undefined') mm.addEventListener = vi.fn();
		if (typeof mm.removeEventListener === 'undefined') mm.removeEventListener = vi.fn();
	} catch { }
}

// ResizeObserver (not provided by some jsdom versions)
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
	(globalThis as any).ResizeObserver = class {
		observe() { }
		unobserve() { }
		disconnect() { }
	};
}

// Minimal FontFace stub + document.fonts
if (typeof (globalThis as any).FontFace === 'undefined') {
	(globalThis as any).FontFace = class {
		family: any;
		source: any;
		descriptors: any;
		constructor(family: any, source: any, descriptors?: any) {
			this.family = family;
			this.source = source;
			this.descriptors = descriptors;
		}
		load() {
			return Promise.resolve(this);
		}
	};
}

if (typeof globalThis.document !== 'undefined') {
	const doc = globalThis.document as any;
	if (typeof doc.fonts === 'undefined') {
		doc.fonts = {
			ready: Promise.resolve(),
			add: () => { },
			delete: () => { },
			forEach: () => { },
		};
	}
}

// atob / btoa (Node environments)
if (typeof globalThis.atob === 'undefined') {
	(globalThis as any).atob = (s: string) => {
		if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('binary');
		// fallback: return input (some tests only need a stub)
		return s;
	};
}
if (typeof globalThis.btoa === 'undefined') {
	(globalThis as any).btoa = (s: string) => {
		if (typeof Buffer !== 'undefined') return Buffer.from(s, 'binary').toString('base64');
		// fallback to identity if Buffer not present
		return s;
	};
}

// localStorage / sessionStorage (in-memory)
function makeStorage() {
	const map = new Map<string, string>();
	return {
		getItem(key: string) {
			return map.has(key) ? map.get(key)! : null;
		},
		setItem(key: string, value: string) {
			map.set(key, String(value));
		},
		removeItem(key: string) {
			map.delete(key);
		},
		clear() {
			map.clear();
		},
		key(i: number) {
			return Array.from(map.keys())[i] ?? null;
		},
		get length() {
			return map.size;
		},
	} as Storage;
}

if (typeof (globalThis as any).localStorage === 'undefined') {
	(globalThis as any).localStorage = makeStorage();
}
if (typeof (globalThis as any).sessionStorage === 'undefined') {
	(globalThis as any).sessionStorage = makeStorage();
}

// navigator.clipboard simple mock
if (typeof (globalThis as any).navigator === 'undefined') (globalThis as any).navigator = {};
if (typeof (globalThis as any).navigator.clipboard === 'undefined') {
	(globalThis as any).navigator.clipboard = {
		async writeText(text: string) {
			(globalThis as any).__clipboard = String(text);
		},
		async readText() {
			return (globalThis as any).__clipboard ?? '';
		},
	};
}

// screen.orientation and location fallback
if (typeof (globalThis as any).screen === 'undefined') (globalThis as any).screen = {};
if (typeof (globalThis as any).screen.orientation === 'undefined') {
	(globalThis as any).screen.orientation = { type: 'landscape-primary', angle: 0, addEventListener() { }, removeEventListener() { } };
}

if (typeof (globalThis as any).location === 'undefined') {
	(globalThis as any).location = {
		href: 'http://localhost/',
		pathname: '/',
		search: '',
		hash: '',
		origin: 'http://localhost',
		assign(url: string) { (globalThis as any).location.href = String(url); },
		replace(url: string) { (globalThis as any).location.href = String(url); },
		reload() { },
		toString() { return (globalThis as any).location.href; },
	};
}

// computedStyleMap — add a minimal no-op implementation on Element.prototype
if (typeof (globalThis as any).Element !== 'undefined') {
	try {
		const proto = (globalThis as any).Element.prototype as any;
		if (typeof proto.computedStyleMap === 'undefined') {
			proto.computedStyleMap = function () {
				return new Map();
			};
		}
	} catch { }
}

// Ensure Element.animate exists (some components call element.animate)
if (typeof (globalThis as any).Element !== 'undefined') {
	try {
		const proto = (globalThis as any).Element.prototype as any;
		if (typeof proto.animate === 'undefined') {
			proto.animate = function () {
				return { finished: Promise.resolve(), cancel() { } };
			};
		}
	} catch { }
}

// document.fonts.load may be used by components — ensure it exists and returns a Promise
if (typeof globalThis.document !== 'undefined') {
	const doc = globalThis.document as any;
	if (doc.fonts && typeof doc.fonts.load !== 'function') {
		doc.fonts.load = (spec: string) => Promise.resolve([]);
	}

	// Some components read header.clientHeight on mount — provide a simple header element
	if (!doc.querySelector('header')) {
		const hdr = doc.createElement('header');
		// define a stable clientHeight for tests
		Object.defineProperty(hdr, 'clientHeight', { configurable: true, value: 100 });
		doc.body.prepend(hdr);
	}
}