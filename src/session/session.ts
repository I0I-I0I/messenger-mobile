import * as AsyncStorage from "./AsyncStorage";

const KEY = "session.userId";

export async function getCurrentUserId() {
    return AsyncStorage.getItem(KEY);
}

export async function setCurrentUserId(userId: string) {
    await AsyncStorage.setItem(KEY, userId);
}

export async function clearCurrentUserId() {
    await AsyncStorage.removeItem(KEY);
}
