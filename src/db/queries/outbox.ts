import { getDb } from "@/src/db";
import type { OutboxRow } from "@/src/db/types";

type DbOutboxRow = {
    id: string;
    type: OutboxRow["type"];
    payload_json: string;
    created_at: number;
    attempts: number;
    next_retry_at: number;
};

function toOutboxRow(row: DbOutboxRow): OutboxRow {
    return {
        id: row.id,
        type: row.type,
        payloadJson: row.payload_json,
        createdAt: row.created_at,
        attempts: row.attempts,
        nextRetryAt: row.next_retry_at,
    };
}

export async function enqueueOutbox(row: OutboxRow) {
    const db = await getDb();

    await db.runAsync(
        `INSERT INTO outbox (
            id,
            type,
            payload_json,
            created_at,
            attempts,
            next_retry_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
            row.id,
            row.type,
            row.payloadJson,
            row.createdAt,
            row.attempts,
            row.nextRetryAt,
        ],
    );

    return row;
}

export async function listOutboxReady(now = Date.now()) {
    const db = await getDb();
    const rows = await db.getAllAsync<DbOutboxRow>(
        `SELECT
            id,
            type,
            payload_json,
            created_at,
            attempts,
            next_retry_at
         FROM outbox
         WHERE next_retry_at <= ?
         ORDER BY created_at ASC`,
        [now],
    );

    return rows.map(toOutboxRow);
}

export async function removeOutboxItem(id: string) {
    const db = await getDb();
    await db.runAsync("DELETE FROM outbox WHERE id = ?", [id]);
}

export async function markOutboxRetry(id: string) {
    const db = await getDb();
    const current = await db.getFirstAsync<DbOutboxRow>(
        `SELECT
            id,
            type,
            payload_json,
            created_at,
            attempts,
            next_retry_at
         FROM outbox
         WHERE id = ?
         LIMIT 1`,
        [id],
    );

    if (!current) {
        return null;
    }

    const attempts = current.attempts + 1;
    const nextRetryAt = Date.now() + Math.min(60_000, attempts * 5_000);

    await db.runAsync(
        `UPDATE outbox
         SET attempts = ?, next_retry_at = ?
         WHERE id = ?`,
        [attempts, nextRetryAt, id],
    );

    return {
        ...toOutboxRow(current),
        attempts,
        nextRetryAt,
    } satisfies OutboxRow;
}
