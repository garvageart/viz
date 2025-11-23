import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ModalContainer from '$lib/components/modals/ModalContainer.svelte';
import { modal } from '$lib/states/index.svelte';

describe('ModalContainer', () => {
    it('renders slot content when modal.show is true', () => {
        // set modal.show true
        modal.show = true as any;

        const { getByText } = render(ModalContainer, { slots: { default: '<div>Inside</div>' } });
        expect(getByText('Inside')).toBeTruthy();

        // cleanup
        modal.show = false as any;
    });
});
