import {
    clearCurrentUserId,
    getCurrentUserId,
    setCurrentUserId,
} from "@/src/session/session";

export async function getSession() {
    const userId = await getCurrentUserId();
    return userId ? { userId } : null;
}

export async function setSession(userId: string) {
    await setCurrentUserId(userId);
}

export async function clearSession() {
    await clearCurrentUserId();
}
