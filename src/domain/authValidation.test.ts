import {
    AUTH_VALIDATION_MESSAGES,
    AUTH_VALIDATION_RULES,
    getFirstFieldError,
    validateLoginInput,
    validatePassword,
    validateRegisterInput,
} from "@/src/domain/authValidation";

describe("authValidation", () => {
    it("requires password with minimum 8 characters", () => {
        expect(validatePassword("")).toBe(
            AUTH_VALIDATION_MESSAGES.passwordRequired,
        );
        expect(
            validatePassword("1234567"),
        ).toBe(AUTH_VALIDATION_MESSAGES.passwordTooShort);
        expect(
            validatePassword("12345678"),
        ).toBeNull();
    });

    it("returns field errors for login form", () => {
        expect(validateLoginInput({ username: "", password: "" })).toEqual({
            username: AUTH_VALIDATION_MESSAGES.usernameRequired,
            password: AUTH_VALIDATION_MESSAGES.passwordRequired,
        });
    });

    it("validates register input using shared constraints", () => {
        expect(
            validateRegisterInput({
                username: "ab",
                displayName: "A",
                password: "1234567",
            }),
        ).toEqual({
            username: AUTH_VALIDATION_MESSAGES.usernameTooShort,
            displayName: AUTH_VALIDATION_MESSAGES.displayNameTooShort,
            password: AUTH_VALIDATION_MESSAGES.passwordTooShort,
        });

        expect(
            validateRegisterInput({
                username: "valid_name",
                displayName: "Alex",
                password: "12345678",
            }),
        ).toEqual({});
    });

    it("finds first field error in deterministic order", () => {
        const firstError = getFirstFieldError({
            username: AUTH_VALIDATION_MESSAGES.usernameTooShort,
            displayName: AUTH_VALIDATION_MESSAGES.displayNameTooShort,
            password: AUTH_VALIDATION_MESSAGES.passwordTooShort,
        });

        expect(firstError).toBe(AUTH_VALIDATION_MESSAGES.usernameTooShort);
        expect(AUTH_VALIDATION_RULES.minPasswordLength).toBe(8);
    });
});
