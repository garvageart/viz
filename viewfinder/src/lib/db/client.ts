import { openDB } from "idb";

export async function initDB() {
    return await openDB("viewfinder", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings");
            }
        }
    });
}
