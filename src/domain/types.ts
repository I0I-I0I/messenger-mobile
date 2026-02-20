export type User = {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    createdAt: number;
};

export type UserWithPassword = User & {
    passwordHash: string;
};

export type Chat = {
    id: string;
    userA: string;
    userB: string;
    createdAt: number;
};

export type Message = {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    createdAt: number;
};

export type ChatListItem = {
    chat: Chat;
    otherUser: User;
    lastMessage: Message | null;
};
