const isTest = process.env.NODE_ENV === "test";

const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    (isTest ? "http://localhost:8000" : undefined);

if (!apiUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_URL environment variable");
}

export default {
    API_URL: apiUrl,
    DEBUG: process.env.NODE_ENV !== "production",
    SEED_LOCAL_DATA:
        process.env.EXPO_PUBLIC_SEED_LOCAL_DATA === "1" ||
        process.env.NODE_ENV === "test",
};
