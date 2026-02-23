import { AppState } from "react-native";

import { getConversationIdsForRealtimeSubscribe } from "@/src/repository/chatRepository";
import { getAccessToken } from "@/src/session/tokens";
import { pullIncrementalSync } from "@/src/sync/messageSync";
import { getReconnectDelayMs } from "@/src/sync/reconnect";
import { applyRealtimeEvent } from "@/src/sync/realtimeSync";
import { refreshAccessToken } from "@/src/transport/rest/auth";
import { createWsClient, type WsClient } from "@/src/transport/ws/client";
import type { WsErrorEvent } from "@/src/transport/ws/types";

const SUBSCRIPTION_REFRESH_INTERVAL_MS = 20_000;

type RealtimeRuntime = {
    stopRequested: boolean;
    getCurrentUserId: () => string | null;
    client: WsClient | null;
    reconnectAttempt: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    subscriptionInterval: ReturnType<typeof setInterval> | null;
    blockedConversationIds: Set<string>;
    syncInFlight: Promise<void> | null;
    appStateSubscription: { remove: () => void } | null;
};

let runtime: RealtimeRuntime | null = null;
let refreshPromise: Promise<void> | null = null;

function clearReconnectTimer(target: RealtimeRuntime) {
    if (!target.reconnectTimer) {
        return;
    }
    clearTimeout(target.reconnectTimer);
    target.reconnectTimer = null;
}

function clearSubscriptionInterval(target: RealtimeRuntime) {
    if (!target.subscriptionInterval) {
        return;
    }
    clearInterval(target.subscriptionInterval);
    target.subscriptionInterval = null;
}

async function runRefreshSingleFlight() {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

function extractConversationIds(details: unknown) {
    if (typeof details !== "object" || details === null) {
        return [];
    }
    const record = details as Record<string, unknown>;
    if (!Array.isArray(record.conversation_ids)) {
        return [];
    }
    return record.conversation_ids.filter(
        (value): value is string => typeof value === "string",
    );
}

async function refreshSubscriptions(target: RealtimeRuntime) {
    const userId = target.getCurrentUserId();
    if (!userId || !target.client) {
        return;
    }

    const ids = await getConversationIdsForRealtimeSubscribe(userId);
    const filtered = ids.filter((id) => !target.blockedConversationIds.has(id));
    target.client.setDesiredSubscriptions(filtered);
}

async function runGapRecoverySync(target: RealtimeRuntime) {
    if (target.syncInFlight) {
        return target.syncInFlight;
    }

    const userId = target.getCurrentUserId();
    if (!userId) {
        return;
    }

    target.syncInFlight = (async () => {
        try {
            await pullIncrementalSync(userId);
        } catch {
            // Regular scheduler keeps retrying as safety path.
        }
    })().finally(() => {
        target.syncInFlight = null;
    });

    return target.syncInFlight;
}

async function reconnectAfterRefresh(target: RealtimeRuntime) {
    try {
        await runRefreshSingleFlight();
    } catch {
        scheduleReconnect(target);
        return;
    }

    if (target.stopRequested || !target.client) {
        return;
    }

    target.client.stop();
    target.client.start();
}

async function handleWsErrorEvent(target: RealtimeRuntime, event: WsErrorEvent) {
    if (event.error.code === "UNAUTHORIZED" || event.error.code === "TOKEN_EXPIRED") {
        await reconnectAfterRefresh(target);
        return;
    }

    if (event.error.code === "FORBIDDEN_CONVERSATION") {
        const ids = extractConversationIds(event.error.details);
        for (const id of ids) {
            target.blockedConversationIds.add(id);
        }
        await refreshSubscriptions(target);
    }
}

function scheduleReconnect(target: RealtimeRuntime) {
    if (target.stopRequested || target.reconnectTimer) {
        return;
    }

    const delay = getReconnectDelayMs(target.reconnectAttempt);
    target.reconnectAttempt += 1;
    target.reconnectTimer = setTimeout(() => {
        target.reconnectTimer = null;
        if (target.stopRequested || !target.client) {
            return;
        }
        target.client.start();
    }, delay);
}

function createRuntimeClient(target: RealtimeRuntime) {
    if (target.client) {
        return;
    }

    target.client = createWsClient({
        getAccessToken,
        onEvent: (event) => {
            if (!runtime || runtime !== target) {
                return;
            }

            if (event.type === "connection.welcome") {
                target.reconnectAttempt = 0;
                void refreshSubscriptions(target);
                void runGapRecoverySync(target);
                return;
            }

            if (event.type === "error") {
                void handleWsErrorEvent(target, event);
                return;
            }

            const userId = target.getCurrentUserId();
            if (!userId) {
                return;
            }

            void applyRealtimeEvent({
                event,
                currentUserId: userId,
            })
                .then((result) => {
                    if (!result.requiresHydrationSync) {
                        return;
                    }
                    void runGapRecoverySync(target);
                })
                .catch(() => {
                    // Scheduler and reconnect sync paths keep data eventually consistent.
                });
        },
        onClose: (info) => {
            if (info.byClient || target.stopRequested) {
                return;
            }
            scheduleReconnect(target);
        },
        onError: (error) => {
            if (error.message === "WS_MISSING_ACCESS_TOKEN") {
                void reconnectAfterRefresh(target);
            }
        },
    });
}

export function stopRealtimeSession() {
    if (!runtime) {
        return;
    }

    runtime.stopRequested = true;
    clearReconnectTimer(runtime);
    clearSubscriptionInterval(runtime);

    if (runtime.appStateSubscription) {
        runtime.appStateSubscription.remove();
        runtime.appStateSubscription = null;
    }

    if (runtime.client) {
        runtime.client.stop();
        runtime.client = null;
    }

    runtime = null;
}

export function startRealtimeSession(getCurrentUserId: () => string | null) {
    stopRealtimeSession();

    const nextRuntime: RealtimeRuntime = {
        stopRequested: false,
        getCurrentUserId,
        client: null,
        reconnectAttempt: 0,
        reconnectTimer: null,
        subscriptionInterval: null,
        blockedConversationIds: new Set(),
        syncInFlight: null,
        appStateSubscription: null,
    };
    runtime = nextRuntime;

    createRuntimeClient(nextRuntime);
    nextRuntime.client?.start();

    nextRuntime.subscriptionInterval = setInterval(() => {
        if (!runtime || runtime !== nextRuntime) {
            return;
        }
        void refreshSubscriptions(nextRuntime);
    }, SUBSCRIPTION_REFRESH_INTERVAL_MS);

    nextRuntime.appStateSubscription = AppState.addEventListener(
        "change",
        (state) => {
            if (!runtime || runtime !== nextRuntime || state !== "active") {
                return;
            }
            nextRuntime.client?.start();
            void refreshSubscriptions(nextRuntime);
            void runGapRecoverySync(nextRuntime);
        },
    );
}
