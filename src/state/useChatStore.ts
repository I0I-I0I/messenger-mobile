import { create } from "zustand";

export type ChatState = {
    draftByChatId: Record<string, string>;
    setDraft: (chatId: string, text: string) => void;
};

export const useChatStore = create<ChatState>((set: any) => ({
    draftByChatId: {},
    setDraft: (chatId: string, text: string) =>
        set((state: ChatState) => ({
            draftByChatId: { ...state.draftByChatId, [chatId]: text },
        })),
}));
