import {
    clearSession,
    getSession,
    setSession,
} from "@/src/repository/sessionRepository";
import { runBootstrapSync } from "@/src/sync/bootstrap";
import { ApiError } from "@/src/transport/rest/client";
import {
    loginRequest,
    logoutRequest,
    registerRequest,
} from "@/src/transport/rest/auth";
import { validateRegistrationInput } from "@/src/domain/validators";

function toCode(error: unknown) {
    if (error instanceof ApiError) {
        return error.code;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "UNKNOWN";
}

export async function hydrateSession() {
    return getSession();
}

export async function loginWithPassword(input: {
    username: string;
    password: string;
}) {
    try {
        const user = await loginRequest({
            username: input.username,
            password: input.password,
        });
        await setSession(user.id);
        try {
            await runBootstrapSync(user.id);
        } catch {
            // Keep auth success even if initial sync fails.
        }
        return { userId: user.id };
    } catch (error) {
        throw new Error(toCode(error));
    }
}

export async function registerWithPassword(input: {
    username: string;
    displayName: string;
    password: string;
}) {
    const validationError = validateRegistrationInput(
        input.username,
        input.displayName,
        input.password,
    );
    if (validationError) {
        throw new Error(validationError);
    }

    try {
        const user = await registerRequest({
            username: input.username,
            display_name: input.displayName,
            password: input.password,
        });
        await setSession(user.id);
        try {
            await runBootstrapSync(user.id);
        } catch {
            // Keep auth success even if initial sync fails.
        }
        return { userId: user.id };
    } catch (error) {
        throw new Error(toCode(error));
    }
}

export async function logoutCurrentSession() {
    try {
        await logoutRequest();
    } catch {
        // Local logout must still succeed while offline.
    } finally {
        await clearSession();
    }
}
