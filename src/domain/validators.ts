import * as Crypto from "expo-crypto";

import {
    getFirstFieldError,
    validateRegisterInput,
} from "@/src/domain/authValidation";

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
    return getFirstFieldError(
        validateRegisterInput({ username, displayName, password }),
    );
}
