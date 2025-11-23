import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LoginButtons from '$lib/components/LoginButtons.svelte';

describe('LoginButtons', () => {
    let originalLocation: any;
    beforeEach(() => {
        originalLocation = (global as any).location;
        (global as any).location = { href: '' };
    });

    it('navigates to oauth URL when clicking buttons', async () => {
        const { getByText } = render(LoginButtons);
        const google = getByText('Sign in with Google');
        await fireEvent.click(google);
        expect((global as any).location.href).toContain('/auth/oauth');
    });

    afterEach(() => {
        (global as any).location = originalLocation;
    });
});
