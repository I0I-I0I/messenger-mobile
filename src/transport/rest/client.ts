import config from "@/src/config";
import { getAccessToken } from "@/src/session/tokens";
import type {
    ApiErrorBody,
    ApiErrorEnvelope,
    ApiSuccessEnvelope,
} from "@/src/transport/rest/types";

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
    status: number;
    code: string;
    details?: unknown;

    constructor(input: {
        message: string;
        status: number;
        code: string;
        details?: unknown;
    }) {
        super(input.message);
        this.name = "ApiError";
        this.status = input.status;
        this.code = input.code;
        this.details = input.details;
    }
}

type RestRequestOptions = Omit<RequestInit, "headers"> & {
    auth?: boolean;
    retryOnUnauthorized?: boolean;
    headers?: Record<string, string>;
};

let unauthorizedRefreshHandler: (() => Promise<void>) | null = null;
let refreshPromise: Promise<void> | null = null;

export function setUnauthorizedRefreshHandler(
    handler: (() => Promise<void>) | null,
) {
    unauthorizedRefreshHandler = handler;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function hasErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
    return (
        isRecord(value) &&
        isRecord(value.error) &&
        typeof value.error.code === "string" &&
        typeof value.error.message === "string"
    );
}

function hasSuccessEnvelope<T>(value: unknown): value is ApiSuccessEnvelope<T> {
    return isRecord(value) && "data" in value;
}

function parseApiErrorBody(status: number, payload: unknown): ApiErrorBody {
    if (hasErrorEnvelope(payload)) {
        return payload.error;
    }

    return {
        code: status === 0 ? "NETWORK_ERROR" : "HTTP_ERROR",
        message:
            status === 0
                ? "Network error"
                : `Request failed with status ${status}`,
    };
}

function buildUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const base = config.API_URL.endsWith("/")
        ? config.API_URL.slice(0, -1)
        : config.API_URL;

    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function parseResponsePayload(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    return response.json().catch(() => null);
}

async function runRefreshSingleFlight() {
    if (!unauthorizedRefreshHandler) {
        throw new ApiError({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Unauthorized",
        });
    }

    if (!refreshPromise) {
        refreshPromise = unauthorizedRefreshHandler().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

export async function restRequest<T>(
    path: string,
    options: RestRequestOptions = {},
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const auth = options.auth ?? true;
    const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
    const token = auth ? getAccessToken() : null;
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const requestInit: RequestInit = {
        ...options,
        headers,
        signal: controller.signal,
    };

    try {
        const response = await fetch(buildUrl(path), requestInit);
        const payload = await parseResponsePayload(response);

        if (response.status === 401 && auth && retryOnUnauthorized) {
            await runRefreshSingleFlight();
            return restRequest<T>(path, {
                ...options,
                retryOnUnauthorized: false,
            });
        }

        if (!response.ok) {
            const errorBody = parseApiErrorBody(response.status, payload);
            throw new ApiError({
                status: response.status,
                code: errorBody.code,
                message: errorBody.message,
                details: errorBody.details,
            });
        }

        if (hasSuccessEnvelope<T>(payload)) {
            return payload.data;
        }

        return payload as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError({
            status: 0,
            code: "NETWORK_ERROR",
            message: "Network error",
            details: error,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}
