import { createId } from "@/src/domain/id";

describe("createId", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("uses the provided prefix and timestamp in the ID", () => {
        jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
        jest.spyOn(Math, "random").mockReturnValue(0.123456789);

        const id = createId("msg");

        expect(id).toMatch(/^msg_1700000000000_[a-z0-9]{8}$/);
    });

    it("generates different IDs for different random values", () => {
        jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
        jest.spyOn(Math, "random")
            .mockReturnValueOnce(0.111111111)
            .mockReturnValueOnce(0.222222222);

        const first = createId("msg");
        const second = createId("msg");

        expect(first).not.toBe(second);
    });
});
