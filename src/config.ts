const isTest = process.env.NODE_ENV === "test";

const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    (isTest ? "http://localhost:8000" : undefined);

if (!apiUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_URL environment variable");
}

function deriveWsUrl(baseApiUrl: string) {
    const url = new URL(baseApiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/v1/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
}

export default {
    API_URL: apiUrl,
    WS_URL: deriveWsUrl(apiUrl),
    DEBUG: process.env.NODE_ENV !== "production",
    SEED_LOCAL_DATA:
        process.env.EXPO_PUBLIC_SEED_LOCAL_DATA === "1" ||
        process.env.NODE_ENV === "test",
};
