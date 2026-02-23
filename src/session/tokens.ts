import * as AsyncStorage from "@/src/session/AsyncStorage";

const REFRESH_TOKEN_KEY = "session.refreshToken";

let accessToken: string | null = null;

type SecureStoreModule = {
    getItemAsync: (key: string) => Promise<string | null>;
    setItemAsync: (key: string, value: string) => Promise<void>;
    deleteItemAsync: (key: string) => Promise<void>;
};

let secureStoreModulePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStoreModule() {
    if (!secureStoreModulePromise) {
        secureStoreModulePromise = (async () => {
            try {
                const module = (await import(
                    "expo-secure-store"
                )) as SecureStoreModule;
                return module;
            } catch {
                return null;
            }
        })();
    }

    return secureStoreModulePromise;
}

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

export async function getRefreshToken() {
    const secureStore = await getSecureStoreModule();
    if (secureStore) {
        return secureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }

    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string) {
    const secureStore = await getSecureStoreModule();
    if (secureStore) {
        await secureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
        return;
    }

    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken() {
    const secureStore = await getSecureStoreModule();
    if (secureStore) {
        await secureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return;
    }

    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
    setAccessToken(null);
    await clearRefreshToken();
}
