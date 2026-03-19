import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

export async function getDb() {
  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const loadedDb = await Database.load("sqlite:tasks.db");
    await loadedDb.execute(`
      CREATE TABLE IF NOT EXISTS manual_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        creator TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    await loadedDb.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    db = loadedDb;
    return loadedDb;
  })();

  return dbPromise;
}

export async function saveSetting(key: string, value: string) {
  const database = await getDb();
  await database.execute(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const results = await database.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key]
  );
  return results.length > 0 ? results[0].value : null;
}

export interface ManualTask {
  id: string;
  title: string;
  description: string;
  creator: string;
  created_at: number;
}

export async function saveManualTask(task: Omit<ManualTask, "id" | "created_at">) {
  const database = await getDb();
  const id = Math.random().toString(36).substring(2, 9);
  const createdAt = Date.now();
  
  await database.execute(
    "INSERT INTO manual_tasks (id, title, description, creator, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, task.title, task.description, task.creator, createdAt]
  );
  
  return { ...task, id, created_at: createdAt };
}

export async function loadManualTasks(): Promise<ManualTask[]> {
  const database = await getDb();
  return await database.select<ManualTask[]>("SELECT * FROM manual_tasks ORDER BY created_at DESC");
}

export async function updateManualTask(id: string, title: string, description: string) {
  const database = await getDb();
  await database.execute(
    "UPDATE manual_tasks SET title = ?, description = ? WHERE id = ?",
    [title, description, id]
  );
}
