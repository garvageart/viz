import { openDB } from "idb";

export async function initDB() {
    return await openDB("viz", 2, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                db.createObjectStore("preferences", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            if (oldVersion < 2) {
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings");
                }
            }
        }
    });
} 