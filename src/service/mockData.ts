import { Chat, Message, User } from "../domain/types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const now = Date.now();

const firstNames = [
    "Liam",
    "Olivia",
    "Noah",
    "Emma",
    "Elijah",
    "Ava",
    "Lucas",
    "Mia",
    "Ethan",
    "Sophia",
    "Mason",
    "Isabella",
    "Logan",
    "Amelia",
    "James",
    "Harper",
    "Benjamin",
    "Evelyn",
    "Henry",
    "Scarlett",
] as const;

const lastNames = [
    "Carter",
    "Brooks",
    "Bennett",
    "Howard",
    "Reed",
    "Cooper",
    "Fisher",
    "Perry",
    "Morgan",
    "Ross",
    "Price",
    "Ward",
    "Gray",
    "Myers",
    "Hughes",
    "West",
    "Sanders",
    "Long",
    "Powell",
    "Patel",
] as const;

const openers = [
    "Hey! How is your day going?",
    "Did you see the latest update?",
    "Can we sync up later?",
    "I just pushed the changes.",
    "Looks good from my side.",
    "Want to grab coffee tomorrow?",
    "I sent the files you asked for.",
    "Let me know what you think.",
    "Nice work on the design.",
    "We can ship this today.",
] as const;

export const MOCK_USERS: User[] = Array.from({ length: 20 }, (_, index) => {
    const id = String(index + 1);
    return {
        id,
        username: `user${id}`,
        displayName: `${firstNames[index]} ${lastNames[index]}`,
        avatar: `https://i.pravatar.cc/150?img=${index + 1}`,
        createdAt: now - (20 - index) * HOUR,
    };
});

export const MOCK_CHATS: Chat[] = Array.from({ length: 20 }, (_, index) => {
    const id = `chat_${index + 1}`;

    if (index < 19) {
        return {
            id,
            userA: "1",
            userB: String(index + 2),
            createdAt: now - (index + 2) * HOUR,
        };
    }

    return {
        id,
        userA: "1",
        userB: "2",
        createdAt: now - 22 * HOUR,
    };
});

export const INITIAL_MESSAGES_BY_CHAT_ID: Record<string, Message[]> =
    MOCK_CHATS.reduce<Record<string, Message[]>>((acc, chat, index) => {
        const secondSpeaker = chat.userB;
        acc[chat.id] = [
            {
                id: `${chat.id}_m1`,
                chatId: chat.id,
                senderId: secondSpeaker,
                content: openers[index % openers.length],
                createdAt: chat.createdAt + 5 * MINUTE,
                status: "sent",
            },
            {
                id: `${chat.id}_m2`,
                chatId: chat.id,
                senderId: chat.userA,
                content: "Yep, I am on it.",
                createdAt: chat.createdAt + 15 * MINUTE,
                status: "sent",
            },
            {
                id: `${chat.id}_m3`,
                chatId: chat.id,
                senderId: secondSpeaker,
                content: "Great, thanks.",
                createdAt: chat.createdAt + 25 * MINUTE,
                status: "sent",
            },
        ];
        return acc;
    }, {});

export function getUserById(userId: string) {
    return MOCK_USERS.find((user) => user.id === userId) ?? null;
}
