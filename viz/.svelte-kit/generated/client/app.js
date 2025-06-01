export { matchers ***REMOVED*** from './matchers.js';

export const nodes = [
	(***REMOVED*** => import('./nodes/0'***REMOVED***,
	(***REMOVED*** => import('./nodes/1'***REMOVED***,
	(***REMOVED*** => import('./nodes/2'***REMOVED***,
	(***REMOVED*** => import('./nodes/3'***REMOVED***,
	(***REMOVED*** => import('./nodes/4'***REMOVED***
];

export const server_loads = [];

export const dictionary = {
		"/": [2],
		"/signin/oauth": [3],
		"/signup": [4]
***REMOVED***;

export const hooks = {
	handleError: (({ error ***REMOVED******REMOVED*** => { console.error(error***REMOVED*** ***REMOVED******REMOVED***,
	
	reroute: ((***REMOVED*** => {***REMOVED******REMOVED***,
	transport: {***REMOVED***
***REMOVED***;

export const decoders = Object.fromEntries(Object.entries(hooks.transport***REMOVED***.map(([k, v]***REMOVED*** => [k, v.decode]***REMOVED******REMOVED***;

export const hash = false;

export const decode = (type, value***REMOVED*** => decoders[type](value***REMOVED***;

export { default as root ***REMOVED*** from '../root.js';