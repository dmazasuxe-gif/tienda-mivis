/**
 * Universal IndexedDB Storage Cache for Mivis Studio Glam
 * ========================================================
 * Provides persistent, fast (0ms), high-capacity storage for:
 * - Products (including large Base64 images without the 5MB localStorage limit)
 * - Customers
 * - Sales
 * - Settings
 *
 * Fully compatible with iOS Safari, Android Chrome, and Desktop browsers.
 */

const DB_NAME = 'mivis_app_cache';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// In-memory fallback in case IndexedDB is restricted (e.g. private browsing in certain browsers)
const memoryStore = new Map<string, unknown>();

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB not supported'));
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    });
}

/**
 * Get an item from cache
 */
export async function getCacheItem<T>(key: string): Promise<T | null> {
    try {
        const db = await openDatabase();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const val = request.result;
                resolve(val !== undefined ? (val as T) : null);
            };

            request.onerror = () => {
                const memVal = memoryStore.get(key);
                resolve(memVal !== undefined ? (memVal as T) : null);
            };
        });
    } catch {
        const memVal = memoryStore.get(key);
        return memVal !== undefined ? (memVal as T) : null;
    }
}

/**
 * Save an item to cache
 */
export async function setCacheItem<T>(key: string, value: T): Promise<void> {
    memoryStore.set(key, value);
    try {
        const db = await openDatabase();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(value, key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve(); // Non-blocking
        });
    } catch {
        // Non-blocking fallback to memory
    }
}

/**
 * Delete an item from cache
 */
export async function deleteCacheItem(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
        const db = await openDatabase();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        });
    } catch {
        // Ignore
    }
}
