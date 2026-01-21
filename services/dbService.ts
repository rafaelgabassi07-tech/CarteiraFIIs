
import { AssetType, AssetFundamentals } from '../types';

const DB_NAME = 'InvestFIIsDB';
const DB_VERSION = 1;
const STORES = {
    METADATA: 'assets_metadata'
};

export interface AssetMetadataDB {
    ticker: string; // Primary Key
    segment: string;
    type: AssetType;
    fundamentals?: AssetFundamentals;
    updatedAt?: number;
}

class DBService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB error:", (event.target as any).error);
                reject("Failed to open DB");
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORES.METADATA)) {
                    db.createObjectStore(STORES.METADATA, { keyPath: 'ticker' });
                }
            };
        });
        return this.initPromise;
    }

    async getAllMetadata(): Promise<AssetMetadataDB[]> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const tx = this.db.transaction(STORES.METADATA, 'readonly');
            const store = tx.objectStore(STORES.METADATA);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    async saveMetadata(item: AssetMetadataDB): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const tx = this.db.transaction(STORES.METADATA, 'readwrite');
            const store = tx.objectStore(STORES.METADATA);
            store.put(item);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async saveBulkMetadata(items: AssetMetadataDB[]): Promise<void> {
        if (items.length === 0) return;
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const tx = this.db.transaction(STORES.METADATA, 'readwrite');
            const store = tx.objectStore(STORES.METADATA);
            
            items.forEach(item => {
                try {
                    store.put(item);
                } catch (e) {
                    console.warn('Failed to save item to IDB:', item.ticker, e);
                }
            });
            
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async clearMetadata(): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const tx = this.db.transaction(STORES.METADATA, 'readwrite');
            const store = tx.objectStore(STORES.METADATA);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
}

export const db = new DBService();
