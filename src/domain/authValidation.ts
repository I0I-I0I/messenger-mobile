export const AUTH_VALIDATION_RULES = {
    minUsernameLength: 3,
    minDisplayNameLength: 2,
    minPasswordLength: 8,
} as const;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export const AUTH_VALIDATION_MESSAGES = {
    usernameRequired: "Введите логин.",
    usernameTooShort: `Логин должен быть не короче ${AUTH_VALIDATION_RULES.minUsernameLength} символов.`,
    usernameInvalidChars:
        "Username может содержать только - буквы, цифры, и символ подчёркивания.",
    displayNameRequired: "Введите имя пользователя.",
    displayNameTooShort: `Имя должно быть длиннее ${AUTH_VALIDATION_RULES.minDisplayNameLength} символов.`,
    passwordRequired: "Введите пароль.",
    passwordTooShort: `Пароль должен содержать не менее ${AUTH_VALIDATION_RULES.minPasswordLength} символов.`,
    invalidCredentials: "Неверный логин или пароль.",
    networkUnavailable: "Сервер недоступен.",
} as const;

export type LoginFieldErrors = {
    username?: string;
    password?: string;
};

export type RegisterFieldErrors = {
    username?: string;
    displayName?: string;
    password?: string;
};

export function validateUsername(username: string): string | null {
    const normalized = username.trim();
    if (!normalized) {
        return AUTH_VALIDATION_MESSAGES.usernameRequired;
    }
    if (normalized.length < AUTH_VALIDATION_RULES.minUsernameLength) {
        return AUTH_VALIDATION_MESSAGES.usernameTooShort;
    }
    if (!USERNAME_PATTERN.test(normalized)) {
        return AUTH_VALIDATION_MESSAGES.usernameInvalidChars;
    }
    return null;
}

export function validateDisplayName(displayName: string): string | null {
    const normalized = displayName.trim();
    if (!normalized) {
        return AUTH_VALIDATION_MESSAGES.displayNameRequired;
    }
    if (normalized.length < AUTH_VALIDATION_RULES.minDisplayNameLength) {
        return AUTH_VALIDATION_MESSAGES.displayNameTooShort;
    }
    return null;
}

export function validatePassword(password: string): string | null {
    if (!password) {
        return AUTH_VALIDATION_MESSAGES.passwordRequired;
    }
    if (password.length < AUTH_VALIDATION_RULES.minPasswordLength) {
        return AUTH_VALIDATION_MESSAGES.passwordTooShort;
    }
    return null;
}

export function validateLoginInput(input: {
    username: string;
    password: string;
}): LoginFieldErrors {
    const usernameError = validateUsername(input.username);
    const passwordError = validatePassword(input.password);
    return {
        ...(usernameError ? { username: usernameError } : {}),
        ...(passwordError ? { password: passwordError } : {}),
    };
}

export function validateRegisterInput(input: {
    username: string;
    displayName: string;
    password: string;
}): RegisterFieldErrors {
    const usernameError = validateUsername(input.username);
    const displayNameError = validateDisplayName(input.displayName);
    const passwordError = validatePassword(input.password);
    return {
        ...(usernameError ? { username: usernameError } : {}),
        ...(displayNameError ? { displayName: displayNameError } : {}),
        ...(passwordError ? { password: passwordError } : {}),
    };
}

export function getFirstFieldError(
    errors: Record<string, string | undefined>,
): string | null {
    const values = Object.values(errors);
    for (const error of values) {
        if (error) {
            return error;
        }
    }
    return null;
}
