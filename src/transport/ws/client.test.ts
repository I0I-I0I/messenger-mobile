import { buildWsUrl, createWsClient } from "@/src/transport/ws/client";

class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances: MockWebSocket[] = [];

    readonly url: string;
    readyState = MockWebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onmessage: ((message: { data?: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose:
        | ((event: { code?: number; reason?: string; wasClean?: boolean }) => void)
        | null = null;
    sent: string[] = [];

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    send(data: string) {
        this.sent.push(data);
    }

    close(code?: number, reason?: string) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({
            code,
            reason,
            wasClean: true,
        });
    }

    emitOpen() {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.();
    }

    emitMessage(data: unknown) {
        this.onmessage?.({ data });
    }

    emitError() {
        this.onerror?.();
    }

    emitClose(code?: number, reason?: string) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code, reason, wasClean: false });
    }
}

describe("ws client", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        MockWebSocket.instances = [];
        (global as any).WebSocket = MockWebSocket;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("builds websocket url from ws base url", () => {
        expect(buildWsUrl("wss://api.example.com/v1/ws", "abc")).toBe(
            "wss://api.example.com/v1/ws?access_token=abc",
        );
    });

    it("connects and manages subscription diff", () => {
        const onError = jest.fn();
        const client = createWsClient({
            getAccessToken: () => "token",
            wsUrl: "ws://localhost:8000/v1/ws?access_token=token",
            onEvent: jest.fn(),
            onError,
        });

        client.start();
        expect(MockWebSocket.instances).toHaveLength(1);
        const socket = MockWebSocket.instances[0];

        client.setDesiredSubscriptions(["c2", "c1"]);
        socket.emitOpen();

        expect(socket.sent).toContain(
            JSON.stringify({
                op: "subscribe",
                conversation_ids: ["c1", "c2"],
            }),
        );

        client.setDesiredSubscriptions(["c2", "c3"]);
        expect(socket.sent).toContain(
            JSON.stringify({
                op: "unsubscribe",
                conversation_ids: ["c1"],
            }),
        );
        expect(socket.sent).toContain(
            JSON.stringify({
                op: "subscribe",
                conversation_ids: ["c3"],
            }),
        );
        expect(onError).not.toHaveBeenCalled();
    });

    it("starts heartbeat ping loop from welcome event", () => {
        const client = createWsClient({
            getAccessToken: () => "token",
            wsUrl: "ws://localhost:8000/v1/ws?access_token=token",
            onEvent: jest.fn(),
        });

        client.start();
        const socket = MockWebSocket.instances[0];
        socket.emitOpen();
        socket.emitMessage(
            JSON.stringify({
                type: "connection.welcome",
                connection_id: "c1",
                user_id: "u1",
                server_time: "2026-02-23T00:00:00Z",
                heartbeat_sec: 5,
                protocol_version: 1,
            }),
        );

        jest.advanceTimersByTime(5_000);

        expect(socket.sent).toContainEqual(
            expect.stringMatching(
                /^\{"op":"ping","ts":[0-9]{13}\}$/,
            ),
        );
    });

    it("reports malformed server frames", () => {
        const onError = jest.fn();
        const client = createWsClient({
            getAccessToken: () => "token",
            wsUrl: "ws://localhost:8000/v1/ws?access_token=token",
            onEvent: jest.fn(),
            onError,
        });

        client.start();
        const socket = MockWebSocket.instances[0];
        socket.emitOpen();
        socket.emitMessage("{ malformed");

        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ message: "WS_INVALID_EVENT" }),
        );
    });
});
