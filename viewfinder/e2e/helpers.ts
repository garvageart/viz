import { type APIRequestContext } from '@playwright/test';

/**
 * Cleans up any test-created collections from the database.
 * Destroys all collections starting with the "E2E-" prefix.
 */
export async function cleanupTestCollections(request: APIRequestContext) {
    try {
        const response = await request.get('/api/collections?limit=100');
        if (!response.ok()) {
            console.error(`Failed to list collections for cleanup: ${response.status()} ${response.statusText()}`);
            return;
        }
        const body = await response.json();
        const collections = body.items || [];
        for (const collection of collections) {
            if (collection.name.startsWith('E2E-')) {
                console.log(`Cleaning up leftover E2E collection: ${collection.name} (${collection.uid})`);
                const deleteRes = await request.delete(`/api/collections/${collection.uid}`);
                if (!deleteRes.ok()) {
                    console.error(`Failed to delete collection ${collection.uid}: ${deleteRes.status()}`);
                }
            }
        }
    } catch (err) {
        console.error('Error during collection cleanup:', err);
    }
}
