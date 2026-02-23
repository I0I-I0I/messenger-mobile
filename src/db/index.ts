import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

import config from "@/src/config";
import { applyMigrations, seedDatabaseIfEmpty } from "@/src/db/schema";

const DATABASE_NAME = "messenger.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function initialize() {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    await db.execAsync("PRAGMA foreign_keys = ON;");
    await db.execAsync("PRAGMA journal_mode = WAL;");

    await applyMigrations(db);
    if (config.SEED_LOCAL_DATA) {
        await seedDatabaseIfEmpty(db);
    }

    return db;
}

export async function getDb() {
    if (!dbPromise) {
        dbPromise = initialize();
    }

    return dbPromise;
}

export async function initDb() {
    await getDb();
}

export async function clearDb() {
    const db = await getDb();

    await db.withTransactionAsync(async () => {
        await db.execAsync(`
            DELETE FROM messages;
            DELETE FROM outbox;
            DELETE FROM conversations;
            DELETE FROM users;
        `);
    });

    if (config.SEED_LOCAL_DATA) {
        await seedDatabaseIfEmpty(db);
    }
}
