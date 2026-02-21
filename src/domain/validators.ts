import * as Crypto from "expo-crypto";

export async function hashPassword(password: string) {
    return Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
    );
}

export function validateRegistrationInput(
    username: string,
    displayName: string,
    password: string,
) {
    if (username.length < 3) {
        return "Логин должен быть не короче 3 символов.";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return "Username может содержать только - буквы, цифры, и символ подчёркивания.";
    }
    if (displayName.trim().length < 2) {
        return "Имя должно быть длиннее 2 символов.";
    }
    if (password.length < 6) {
        return "Пароль должен содержать не менее 6 символов.";
    }
    return null;
}
