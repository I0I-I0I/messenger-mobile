const RECONNECT_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];
const DEFAULT_JITTER_RATIO = 0.2;

export function getReconnectBaseDelayMs(attempt: number) {
    if (attempt <= 0) {
        return RECONNECT_STEPS_MS[0];
    }

    const index = Math.min(attempt, RECONNECT_STEPS_MS.length - 1);
    return RECONNECT_STEPS_MS[index];
}

export function applyJitter(
    baseDelayMs: number,
    randomValue: number = Math.random(),
    jitterRatio: number = DEFAULT_JITTER_RATIO,
) {
    const clampedRandom = Math.max(0, Math.min(1, randomValue));
    const clampedJitter = Math.max(0, Math.min(1, jitterRatio));
    const range = baseDelayMs * clampedJitter;
    const min = baseDelayMs - range;
    const max = baseDelayMs + range;
    return Math.round(min + (max - min) * clampedRandom);
}

export function getReconnectDelayMs(
    attempt: number,
    randomValue: number = Math.random(),
) {
    const base = getReconnectBaseDelayMs(attempt);
    return applyJitter(base, randomValue);
}
