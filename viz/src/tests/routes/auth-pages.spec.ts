import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LoginPage from '../../routes/auth/login/+page.svelte';
import RegisterPage from '../../routes/auth/register/+page.svelte';

describe('auth pages', () => {
    it('renders login page and has form elements', () => {
        const { container } = render(LoginPage);
        expect(container).toBeTruthy();
        // look for button elements
        expect(container.querySelector('button') || container.querySelector('input[type="submit"]')).toBeTruthy();
    });

    it('renders register page and has input elements', () => {
        const { container, getByPlaceholderText } = render(RegisterPage);
        expect(container).toBeTruthy();
        // registration page should have at least one input placeholder
        const input = container.querySelector('input') || container.querySelector('textarea');
        expect(input).toBeTruthy();
    });
});
