import { restRequest } from "@/src/transport/rest/client";
import type { ApiUserDto } from "@/src/transport/rest/types";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isUserDtoArray(value: unknown): value is ApiUserDto[] {
    return Array.isArray(value);
}

function pickUsersArray(value: unknown): ApiUserDto[] {
    if (isUserDtoArray(value)) {
        return value;
    }

    if (!isRecord(value)) {
        return [];
    }

    const directCandidates = [
        value.users,
        value.items,
        value.results,
        value.rows,
    ];
    for (const candidate of directCandidates) {
        if (isUserDtoArray(candidate)) {
            return candidate;
        }
    }

    if (isRecord(value.data)) {
        return pickUsersArray(value.data);
    }

    return [];
}

function buildQueryString(input: {
    query?: string;
    limit?: number;
}) {
    const pairs: string[] = [];
    if (typeof input.query === "string") {
        pairs.push(`query=${encodeURIComponent(input.query)}`);
    }
    if (typeof input.limit === "number") {
        pairs.push(`limit=${encodeURIComponent(String(input.limit))}`);
    }

    return pairs.join("&");
}

export async function searchUsersRequest(input: {
    query?: string;
    limit?: number;
}) {
    const query = buildQueryString(input);
    const payload = await restRequest<unknown>(
        `/v1/users/search${query ? `?${query}` : ""}`,
    );
    return pickUsersArray(payload);
}

export async function batchUsersRequest(input: {
    ids: string[];
}) {
    if (!Array.isArray(input.ids) || input.ids.length === 0) {
        return [];
    }

    const payload = await restRequest<unknown>("/v1/users/batch", {
        method: "POST",
        body: JSON.stringify({ ids: input.ids }),
    });

    return pickUsersArray(payload);
}
