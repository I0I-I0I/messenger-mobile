import { isUsersUsernameUniqueConstraintError } from "@/src/db/sqliteErrors";

describe("sqliteErrors", () => {
    it("detects direct users.username unique constraint messages", () => {
        expect(
            isUsersUsernameUniqueConstraintError(
                new Error("Error code 19: UNIQUE constraint failed: users.username"),
            ),
        ).toBe(true);
    });

    it("detects nested cause messages", () => {
        const error = {
            message: "Calling finalizeAsync failed",
            cause: {
                message: "Error code 19: UNIQUE constraint failed: users.username",
            },
        };
        expect(isUsersUsernameUniqueConstraintError(error)).toBe(true);
    });

    it("returns false for unrelated errors", () => {
        expect(
            isUsersUsernameUniqueConstraintError(
                new Error("UNIQUE constraint failed: messages.id"),
            ),
        ).toBe(false);
    });
});
