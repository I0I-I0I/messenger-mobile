import { AppState } from "react-native";

import { processOutboxOnce } from "@/src/sync/outboxProcessor";
import { pullIncrementalSync } from "@/src/sync/messageSync";

const DEFAULT_SYNC_INTERVAL_MS = 20_000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let unsubscribeAppState: (() => void) | null = null;
let inFlight: Promise<void> | null = null;

export async function runSyncCycle(currentUserId: string) {
    if (inFlight) {
        return inFlight;
    }

    inFlight = (async () => {
        await processOutboxOnce();
        try {
            await pullIncrementalSync(currentUserId);
        } catch {
            // Pull sync can fail transiently without breaking local UX.
        }
    })().finally(() => {
        inFlight = null;
    });

    return inFlight;
}

export function stopSyncScheduler() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }

    if (unsubscribeAppState) {
        unsubscribeAppState();
        unsubscribeAppState = null;
    }
}

export function startSyncScheduler(input: {
    getCurrentUserId: () => string | null;
    intervalMs?: number;
}) {
    stopSyncScheduler();

    const runIfAuthorized = async () => {
        const currentUserId = input.getCurrentUserId();
        if (!currentUserId) {
            return;
        }

        try {
            await runSyncCycle(currentUserId);
        } catch {
            // Ignore scheduler errors; retries happen on next cycle.
        }
    };

    void runIfAuthorized();

    const intervalMs = input.intervalMs ?? DEFAULT_SYNC_INTERVAL_MS;
    intervalHandle = setInterval(() => {
        void runIfAuthorized();
    }, intervalMs);

    const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
            void runIfAuthorized();
        }
    });

    unsubscribeAppState = () => {
        subscription.remove();
    };

    return stopSyncScheduler;
}
