import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AdminPage from '../../routes/(app)/admin/+page.svelte';
import AdminJobsPage from '../../routes/(app)/admin/jobs/+page.svelte';
import AdminEventsPage from '../../routes/(app)/admin/events/+page.svelte';

describe('admin pages', () => {
    it('renders admin index page', () => {
        const { container } = render(AdminPage);
        expect(container).toBeTruthy();
    });

    it('renders admin jobs page', () => {
        const { container } = render(AdminJobsPage);
        expect(container).toBeTruthy();
    });

    it('renders admin events page', () => {
        const { container } = render(AdminEventsPage);
        expect(container).toBeTruthy();
    });
});
