import type { Project, Settings } from '../types';

const DB_NAME = 'LocalWebIDE_V2';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const SETTINGS_STORE = 'settings';
const LAST_PROJECT_ID_KEY = 'last_project_id';
const LAST_SETTINGS_KEY = 'last_settings';

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
      if (!dbInstance.objectStoreNames.contains(PROJECT_STORE)) {
        dbInstance.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(SETTINGS_STORE)) {
        dbInstance.createObjectStore(SETTINGS_STORE);
      }
    };
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction(PROJECT_STORE, 'readwrite');
  const store = transaction.objectStore(PROJECT_STORE);
  store.put(project);
  localStorage.setItem(LAST_PROJECT_ID_KEY, project.id);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadProjectById(projectId: string): Promise<Project | null> {
  const db = await getDb();
  const transaction = db.transaction(PROJECT_STORE, 'readonly');
  const store = transaction.objectStore(PROJECT_STORE);
  const request = store.get(projectId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects(): Promise<Project[]> {
    const db = await getDb();
    const transaction = db.transaction(PROJECT_STORE, 'readonly');
    const store = transaction.objectStore(PROJECT_STORE);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteProject(projectId: string): Promise<void> {
    const db = await getDb();
    const transaction = db.transaction(PROJECT_STORE, 'readwrite');
    const store = transaction.objectStore(PROJECT_STORE);
    store.delete(projectId);
     if (localStorage.getItem(LAST_PROJECT_ID_KEY) === projectId) {
        localStorage.removeItem(LAST_PROJECT_ID_KEY);
    }
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
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