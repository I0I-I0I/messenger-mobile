jest.mock("@/src/transport/rest/client", () => ({
    restRequest: jest.fn(),
}));

import { restRequest } from "@/src/transport/rest/client";
import { changesSyncRequest } from "@/src/transport/rest/sync";

const mockedRestRequest = jest.mocked(restRequest);

describe("sync transport", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("calls /sync/changes even when cursor map is empty", async () => {
        mockedRestRequest.mockResolvedValue({
            changes: [],
        } as any);

        await changesSyncRequest({});

        expect(mockedRestRequest).toHaveBeenCalledWith("/v1/sync/changes");
    });

    it("normalizes legacy backend 'changes' payload into flat messages", async () => {
        mockedRestRequest.mockResolvedValue({
            users: [
                {
                    id: "user-a",
                    username: "alice",
                },
            ],
            changes: [
                {
                    conversation_id: "chat-1",
                    messages: [
                        {
                            id: "m1",
                            conversation_id: "chat-1",
                            sender_id: "user-a",
                            seq: 1,
                            content: "hello",
                        },
                    ],
                },
                {
                    conversation_id: "chat-2",
                    messages: [
                        {
                            id: "m2",
                            conversation_id: "chat-2",
                            sender_id: "user-b",
                            seq: 3,
                            content: "hey",
                        },
                    ],
                },
            ],
        } as any);

        const payload = await changesSyncRequest({
            "chat-1": 1,
        });

        expect(mockedRestRequest).toHaveBeenCalledWith(
            "/v1/sync/changes?after_seq_by_conversation=%7B%22chat-1%22%3A1%7D",
        );
        expect(payload.users).toEqual([
            expect.objectContaining({
                id: "user-a",
            }),
        ]);
        expect(payload.conversations).toEqual([]);
        expect(payload.messages).toHaveLength(2);
        expect(payload.messages?.map((m: any) => m.id)).toEqual(["m1", "m2"]);
    });
});
