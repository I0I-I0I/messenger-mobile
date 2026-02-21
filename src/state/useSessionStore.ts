import { create } from "zustand";

import { initDb } from "@/src/db";
import { logoutCurrentSession } from "@/src/usecases/auth";
import { getSession, setSession } from "@/src/repository/sessionRepository";

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
        await initDb();
        const session = await getSession();
        const userId = session?.userId ?? null;
        set({ userId, hydrated: true });
    },
    login: async (userId: string) => {
        await setSession(userId);
        set({ userId, hydrated: true });
    },
    logout: async () => {
        await logoutCurrentSession();
        set({ userId: null, hydrated: true });
    },
}));
