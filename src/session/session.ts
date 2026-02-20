import AsyncStorage from "@react-native-async-storage/async-storage";

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
