import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CollectionModal from '$lib/components/CollectionModal.svelte';

describe('CollectionModal form', () => {
    it('calls modalAction with form data when submitted', async () => {
        const handler = vi.fn((e: SubmitEvent) => {
            // prevent default not necessary; CollectionModal already prevents
        });

        const { container, getByLabelText } = render(CollectionModal, {
            heading: 'Create',
            buttonText: 'Create',
            modalAction: handler
        });

        const nameInput = container.querySelector('#collection-name') as HTMLInputElement;
        const desc = container.querySelector('#collection-description') as HTMLTextAreaElement;
        expect(nameInput).toBeTruthy();

        await fireEvent.input(nameInput, { target: { value: 'My Collection' } });
        await fireEvent.input(desc, { target: { value: 'A description' } });

        const form = container.querySelector('#collection-form') as HTMLFormElement;
        await fireEvent.submit(form);

        expect(handler).toHaveBeenCalled();
    });
});
