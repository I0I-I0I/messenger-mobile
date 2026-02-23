jest.mock("@/src/transport/rest/client", () => ({
    restRequest: jest.fn(),
}));

import * as restClient from "@/src/transport/rest/client";
import { batchUsersRequest, searchUsersRequest } from "@/src/transport/rest/users";

const mockedRestRequest = jest.mocked(restClient.restRequest);

describe("users transport", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("builds encoded query string for search", async () => {
        mockedRestRequest.mockResolvedValue([] as any);

        await searchUsersRequest({
            query: "al ice+test&one",
            limit: 20,
        });

        expect(mockedRestRequest).toHaveBeenCalledWith(
            "/v1/users/search?query=al%20ice%2Btest%26one&limit=20",
        );
    });

    it("extracts users from raw array and nested envelopes", async () => {
        mockedRestRequest.mockResolvedValueOnce([{ id: "1" }] as any);
        await expect(searchUsersRequest({ query: "a" })).resolves.toEqual([
            { id: "1" },
        ]);

        mockedRestRequest.mockResolvedValueOnce({
            data: {
                items: [{ id: "2" }],
            },
        } as any);
        await expect(searchUsersRequest({ query: "b" })).resolves.toEqual([
            { id: "2" },
        ]);
    });

    it("returns empty array for malformed search payload", async () => {
        mockedRestRequest.mockResolvedValue("invalid" as any);

        await expect(searchUsersRequest({ query: "a" })).resolves.toEqual([]);
    });

    it("returns empty array for empty batch ids without request", async () => {
        await expect(batchUsersRequest({ ids: [] })).resolves.toEqual([]);
        expect(mockedRestRequest).not.toHaveBeenCalled();
    });

    it("returns empty array for malformed batch payload", async () => {
        mockedRestRequest.mockResolvedValue({ data: { users: null } } as any);

        await expect(batchUsersRequest({ ids: ["1"] })).resolves.toEqual([]);
    });
});
