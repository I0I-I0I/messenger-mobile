import { restRequest } from "@/src/transport/rest/client";
import type { ApiUserDto } from "@/src/transport/rest/types";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function pickUsersArray(value: unknown): ApiUserDto[] | null {
    if (Array.isArray(value)) {
        return value as ApiUserDto[];
    }

    if (!isRecord(value)) {
        return null;
    }

    const directCandidates = [
        value.users,
        value.items,
        value.results,
        value.rows,
    ];
    for (const candidate of directCandidates) {
        if (Array.isArray(candidate)) {
            return candidate as ApiUserDto[];
        }
    }

    if (isRecord(value.data)) {
        const nested = pickUsersArray(value.data);
        if (nested) {
            return nested;
        }
    }

    return null;
}

export async function searchUsersRequest(input: {
    query?: string;
    limit?: number;
}) {
    const params = new URLSearchParams();
    if (typeof input.query === "string") {
        params.set("query", input.query);
    }
    if (typeof input.limit === "number") {
        params.set("limit", String(input.limit));
    }

    const query = params.toString();
    const payload = await restRequest<unknown>(
        `/v1/users/search${query ? `?${query}` : ""}`,
    );
    return pickUsersArray(payload) ?? [];
}
