import {
    clearTokens,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
} from "@/src/session/tokens";
import {
    ApiError,
    restRequest,
    setUnauthorizedRefreshHandler,
} from "@/src/transport/rest/client";
import type {
    ApiUserDto,
    AuthResponseDto,
    AuthTokensDto,
} from "@/src/transport/rest/types";

function getTokenValue(tokens: AuthTokensDto, key: "access" | "refresh") {
    if (key === "access") {
        return tokens.access_token ?? tokens.accessToken ?? null;
    }
    return tokens.refresh_token ?? tokens.refreshToken ?? null;
}

async function applyAuthTokens(tokens: AuthTokensDto) {
    const access = getTokenValue(tokens, "access");
    const refresh = getTokenValue(tokens, "refresh");

    if (!access || !refresh) {
        throw new Error("INVALID_AUTH_TOKENS");
    }

    setAccessToken(access);
    await setRefreshToken(refresh);
}

export async function loginRequest(input: {
    username: string;
    password: string;
}) {
    const response = await restRequest<AuthResponseDto>("/v1/auth/login", {
        method: "POST",
        auth: false,
        retryOnUnauthorized: false,
        body: JSON.stringify(input),
    });
    await applyAuthTokens(response.tokens);
    return response.user;
}

export async function registerRequest(input: {
    username: string;
    display_name?: string;
    displayName?: string;
    password: string;
}) {
    const response = await restRequest<AuthResponseDto>("/v1/auth/register", {
        method: "POST",
        auth: false,
        retryOnUnauthorized: false,
        body: JSON.stringify(input),
    });
    await applyAuthTokens(response.tokens);
    return response.user;
}

export async function refreshAccessToken() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        await clearTokens();
        throw new ApiError({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Missing refresh token",
        });
    }

    const response = await restRequest<
        { tokens: AuthTokensDto } | AuthResponseDto | AuthTokensDto
    >("/v1/auth/refresh", {
        method: "POST",
        auth: false,
        retryOnUnauthorized: false,
        body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const tokens =
        "tokens" in response
            ? response.tokens
            : "access_token" in response || "accessToken" in response
              ? response
              : null;
    if (!tokens) {
        throw new ApiError({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Invalid refresh response",
        });
    }

    await applyAuthTokens(tokens);
}

export async function logoutRequest() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        await clearTokens();
        return;
    }

    try {
        await restRequest<{ ok: boolean }>("/v1/auth/logout", {
            method: "POST",
            auth: false,
            retryOnUnauthorized: false,
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
    } finally {
        await clearTokens();
    }
}

export async function meRequest() {
    return restRequest<ApiUserDto>("/v1/users/me");
}

setUnauthorizedRefreshHandler(refreshAccessToken);
