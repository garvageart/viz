import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ImageCard from '$lib/components/ImageCard.svelte';

describe('ImageCard component', () => {
    beforeEach(() => {
        // ensure atob exists in test environment
        if (!(global as any).atob) {
            (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
        }
    });

    it('renders asset metadata and toggles loaded class on image load', async () => {
        const asset = {
            uid: '123',
            name: 'MyPic',
            created_at: '2020-01-01T00:00:00Z',
            image_paths: { thumbnail: 'https://example.com/thumb.jpg' },
            image_metadata: { file_name: 'file.jpg' }
        } as any;

        const { container, getByTitle, getByText } = render(ImageCard, { asset });

        const root = container.querySelector('.image-card');
        expect(root?.getAttribute('data-asset-id')).toBe('123');

        // Name rendered
        expect(getByText('file.jpg')).toBeTruthy();

        // simulate image load
        const img = container.querySelector('.image-card-image') as HTMLImageElement;
        expect(img).toBeTruthy();

        await fireEvent.load(img);
        // after load, the element should have class 'loaded'
        expect(img.classList.contains('loaded')).toBe(true);
    });
});
