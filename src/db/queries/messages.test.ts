jest.mock("@/src/db", () => ({
    getDb: jest.fn(),
}));

import { getDb } from "@/src/db";
import { listMessagesByConversation } from "@/src/db/queries/messages";

const mockedGetDb = jest.mocked(getDb);

function createRow(input: {
    id: string;
    createdAt: number;
    serverSeq?: number | null;
    status?: "pending" | "sent" | "failed";
}) {
    return {
        id: input.id,
        conversation_id: "chat-1",
        sender_id: "user-1",
        client_message_id: `client-${input.id}`,
        server_id:
            typeof input.serverSeq === "number"
                ? `server-${input.id}`
                : null,
        server_seq: input.serverSeq ?? null,
        server_created_at: input.createdAt,
        content: input.id,
        created_at: input.createdAt,
        status: input.status ?? "sent",
        server_echo: input.status === "sent" ? 1 : 0,
    };
}

describe("messages query ordering", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("keeps failed/pending messages in timeline order by createdAt", async () => {
        const db = {
            getAllAsync: jest.fn().mockResolvedValue([
                createRow({
                    id: "sent-new",
                    createdAt: 200,
                    serverSeq: 5,
                    status: "sent",
                }),
                createRow({
                    id: "failed-old",
                    createdAt: 100,
                    serverSeq: null,
                    status: "failed",
                }),
            ]),
        } as any;
        mockedGetDb.mockResolvedValue(db);

        const rows = await listMessagesByConversation("chat-1");

        expect(rows.map((row) => row.id)).toEqual([
            "failed-old",
            "sent-new",
        ]);
    });

    it("uses server sequence as tie-breaker for equal timestamps", async () => {
        const db = {
            getAllAsync: jest.fn().mockResolvedValue([
                createRow({
                    id: "sent-seq-2",
                    createdAt: 100,
                    serverSeq: 2,
                    status: "sent",
                }),
                createRow({
                    id: "sent-seq-1",
                    createdAt: 100,
                    serverSeq: 1,
                    status: "sent",
                }),
                createRow({
                    id: "pending-no-seq",
                    createdAt: 100,
                    serverSeq: null,
                    status: "pending",
                }),
            ]),
        } as any;
        mockedGetDb.mockResolvedValue(db);

        const rows = await listMessagesByConversation("chat-1");

        expect(rows.map((row) => row.id)).toEqual([
            "sent-seq-1",
            "sent-seq-2",
            "pending-no-seq",
        ]);
    });
});
