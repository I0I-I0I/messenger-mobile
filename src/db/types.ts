export type MessageStatus = "pending" | "sent" | "failed";

export type UserRow = {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    createdAt: number;
    updatedAt: number;
    passwordHash?: string;
};

export type ConversationRow = {
    id: string;
    userA: string;
    userB: string;
    createdAt: number;
    updatedAt: number;
    lastMessagePreview: string;
    lastMessageAt: number;
    unreadCount: number;
};

export type MessageRow = {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: number;
    status: MessageStatus;
    serverEcho: 0 | 1;
};

export type OutboxRow = {
    id: string;
    type: "send_message";
    payloadJson: string;
    createdAt: number;
    attempts: number;
    nextRetryAt: number;
};
