import { createUser, getUserAuthByUsername } from "@/src/repository/userRepository";
import { clearSession, getSession, setSession } from "@/src/repository/sessionRepository";
import { hashPassword, validateRegistrationInput } from "@/src/domain/validators";

export async function hydrateSession() {
    return getSession();
}

export async function loginWithPassword(input: {
    username: string;
    password: string;
}) {
    const auth = await getUserAuthByUsername(input.username);
    if (!auth) {
        throw new Error("USER_NOT_FOUND");
    }

    const hash = await hashPassword(input.password);
    if (hash !== auth.passwordHash) {
        throw new Error("INVALID_PASSWORD");
    }

    await setSession(auth.id);
    return { userId: auth.id };
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

    const existing = await getUserAuthByUsername(input.username);
    if (existing) {
        throw new Error("USERNAME_TAKEN");
    }

    const passwordHash = await hashPassword(input.password);
    const created = await createUser({
        username: input.username,
        displayName: input.displayName,
        passwordHash,
    });

    if (!created) {
        throw new Error("REGISTER_FAILED");
    }

    await setSession(created.id);
    return { userId: created.id };
}

export async function logoutCurrentSession() {
    await clearSession();
}
