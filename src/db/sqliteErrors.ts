const USERS_USERNAME_UNIQUE_CONSTRAINT =
    "unique constraint failed: users.username";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function hasUsersUsernameConstraintMarker(value: string) {
    return value
        .toLowerCase()
        .includes(USERS_USERNAME_UNIQUE_CONSTRAINT);
}

export function isUsersUsernameUniqueConstraintError(error: unknown) {
    const queue: unknown[] = [error];
    const visited = new Set<unknown>();

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) {
            continue;
        }
        visited.add(current);

        if (typeof current === "string") {
            if (hasUsersUsernameConstraintMarker(current)) {
                return true;
            }
            continue;
        }

        if (current instanceof Error) {
            if (hasUsersUsernameConstraintMarker(current.message)) {
                return true;
            }
        }

        if (!isRecord(current)) {
            continue;
        }

        for (const key of ["message", "details", "description", "reason"]) {
            const value = current[key];
            if (
                typeof value === "string" &&
                hasUsersUsernameConstraintMarker(value)
            ) {
                return true;
            }
        }

        for (const key of ["cause", "error", "details", "nativeError"]) {
            if (key in current) {
                queue.push(current[key]);
            }
        }
    }

    return false;
}
