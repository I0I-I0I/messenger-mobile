import {
    applyJitter,
    getReconnectBaseDelayMs,
    getReconnectDelayMs,
} from "@/src/sync/reconnect";

describe("reconnect policy", () => {
    it("uses capped exponential base delays", () => {
        expect(getReconnectBaseDelayMs(0)).toBe(1_000);
        expect(getReconnectBaseDelayMs(1)).toBe(2_000);
        expect(getReconnectBaseDelayMs(2)).toBe(4_000);
        expect(getReconnectBaseDelayMs(3)).toBe(8_000);
        expect(getReconnectBaseDelayMs(4)).toBe(15_000);
        expect(getReconnectBaseDelayMs(20)).toBe(30_000);
    });

    it("applies deterministic jitter within +/- 20%", () => {
        expect(applyJitter(1_000, 0)).toBe(800);
        expect(applyJitter(1_000, 0.5)).toBe(1_000);
        expect(applyJitter(1_000, 1)).toBe(1_200);
    });

    it("combines base delay and jitter", () => {
        expect(getReconnectDelayMs(2, 0)).toBe(3_200);
        expect(getReconnectDelayMs(2, 1)).toBe(4_800);
    });
});
