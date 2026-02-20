import { create } from "zustand";

import {
    clearCurrentUserId,
    getCurrentUserId,
    setCurrentUserId,
} from "@/src/session/session";

export type SessionState = {
    userId: string | null;
    hydrated: boolean;
    hydrate: () => Promise<void>;
    login: (userId: string) => Promise<void>;
    logout: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set: any) => ({
    userId: null,
    hydrated: false,
    hydrate: async () => {
        const userId = await getCurrentUserId();
        set({ userId, hydrated: true });
    },
    login: async (userId: string) => {
        await setCurrentUserId(userId);
        set({ userId, hydrated: true });
    },
    logout: async () => {
        await clearCurrentUserId();
        set({ userId: null, hydrated: true });
    },
}));
