import { describe, test, expect ***REMOVED*** from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen ***REMOVED*** from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/+page.svelte', (***REMOVED*** => {
	test('should render h1', (***REMOVED*** => {
		render(Page***REMOVED***;
		expect(screen.getByRole('heading', { level: 1 ***REMOVED******REMOVED******REMOVED***.toBeInTheDocument(***REMOVED***;
***REMOVED******REMOVED***;
***REMOVED******REMOVED***;
