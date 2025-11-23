import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CollectionModal from '../../lib/components/CollectionModal.svelte';

describe('CollectionModal component', () => {
    it('renders heading and calls modalAction on submit', async () => {
        const modalAction = vi.fn();
        const { getByText, container } = render(CollectionModal, { heading: 'Create', buttonText: 'Save', modalAction });

        // heading present
        expect(getByText('Create')).toBeTruthy();

        const form = container.querySelector('#collection-form') as HTMLFormElement;
        expect(form).toBeTruthy();

        await fireEvent.submit(form);
        expect(modalAction).toHaveBeenCalled();
    });
});
