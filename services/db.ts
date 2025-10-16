
import type { ProjectFile, Settings } from '../types';

const DB_NAME = 'LocalWebIDE';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const SETTINGS_STORE = 'settings';
const LAST_PROJECT_KEY = 'lastProject';
const LAST_SETTINGS_KEY = 'lastSettings';

let db: IDBDatabase;

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(FILES_STORE)) {
        dbInstance.createObjectStore(FILES_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(SETTINGS_STORE)) {
        dbInstance.createObjectStore(SETTINGS_STORE);
      }
    };
  });
}

export async function saveFiles(files: ProjectFile[]): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction(FILES_STORE, 'readwrite');
  const store = transaction.objectStore(FILES_STORE);
  store.clear(); // Clear old files
  files.forEach(file => store.put(file));
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadFiles(): Promise<ProjectFile[]> {
  const db = await getDb();
  const transaction = db.transaction(FILES_STORE, 'readonly');
  const store = transaction.objectStore(FILES_STORE);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
    const db = await getDb();
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    store.put(settings, LAST_SETTINGS_KEY);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function loadSettings(): Promise<Settings | null> {
    const db = await getDb();
    const transaction = db.transaction(SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get(LAST_SETTINGS_KEY);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}
