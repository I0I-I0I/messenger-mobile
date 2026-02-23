import config from "@/src/config";
import type { WsCommand, WsServerEvent } from "@/src/transport/ws/types";
import { parseWsServerEvent } from "@/src/transport/ws/types";

export type WsClientStatus =
    | "idle"
    | "connecting"
    | "open"
    | "closed";

export type WsClientCloseInfo = {
    code?: number;
    reason?: string;
    wasClean?: boolean;
    byClient: boolean;
};

export type WsClient = {
    start: () => void;
    stop: () => void;
    setDesiredSubscriptions: (conversationIds: string[]) => void;
    getStatus: () => WsClientStatus;
};

type CreateWsClientOptions = {
    getAccessToken: () => string | null;
    onEvent: (event: WsServerEvent) => void;
    onStatusChange?: (status: WsClientStatus) => void;
    onError?: (error: Error) => void;
    onClose?: (info: WsClientCloseInfo) => void;
    wsUrl?: string;
};

function toError(error: unknown, fallbackCode: string) {
    if (error instanceof Error) {
        return error;
    }
    return new Error(fallbackCode);
}

export function buildWsUrl(baseWsUrl: string, accessToken: string) {
    const url = new URL(baseWsUrl);
    url.search = "";
    url.searchParams.set("access_token", accessToken);
    url.hash = "";
    return url.toString();
}

function diffSets(current: Set<string>, next: Set<string>) {
    const toRemove: string[] = [];
    const toAdd: string[] = [];

    for (const value of current) {
        if (!next.has(value)) {
            toRemove.push(value);
        }
    }

    for (const value of next) {
        if (!current.has(value)) {
            toAdd.push(value);
        }
    }

    return {
        toRemove: toRemove.sort(),
        toAdd: toAdd.sort(),
    };
}

export function createWsClient(options: CreateWsClientOptions): WsClient {
    let socket: WebSocket | null = null;
    let status: WsClientStatus = "idle";
    let stoppedByClient = false;
    let desiredSubscriptions = new Set<string>();
    let activeSubscriptions = new Set<string>();
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    function setStatus(next: WsClientStatus) {
        if (status === next) {
            return;
        }
        status = next;
        options.onStatusChange?.(status);
    }

    function clearHeartbeat() {
        if (!heartbeatInterval) {
            return;
        }
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    function send(command: WsCommand) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            socket.send(JSON.stringify(command));
            return true;
        } catch (error) {
            options.onError?.(toError(error, "WS_SEND_FAILED"));
            return false;
        }
    }

    function applySubscriptionDiff() {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }

        const { toRemove, toAdd } = diffSets(
            activeSubscriptions,
            desiredSubscriptions,
        );

        if (toRemove.length > 0) {
            const ok = send({
                op: "unsubscribe",
                conversation_ids: toRemove,
            });
            if (ok) {
                for (const id of toRemove) {
                    activeSubscriptions.delete(id);
                }
            }
        }

        if (toAdd.length > 0) {
            const ok = send({
                op: "subscribe",
                conversation_ids: toAdd,
            });
            if (ok) {
                for (const id of toAdd) {
                    activeSubscriptions.add(id);
                }
            }
        }
    }

    function handleMessage(data: unknown) {
        const event = parseWsServerEvent(data);
        if (!event) {
            options.onError?.(new Error("WS_INVALID_EVENT"));
            return;
        }

        if (event.type === "connection.welcome") {
            clearHeartbeat();
            const heartbeatMs = Math.max(5_000, event.heartbeat_sec * 1_000);
            heartbeatInterval = setInterval(() => {
                send({ op: "ping", ts: Date.now() });
            }, heartbeatMs);
        }

        options.onEvent(event);
    }

    function buildSocketUrl() {
        if (options.wsUrl) {
            return options.wsUrl;
        }

        const accessToken = options.getAccessToken();
        if (!accessToken) {
            throw new Error("WS_MISSING_ACCESS_TOKEN");
        }

        return buildWsUrl(config.WS_URL, accessToken);
    }

    function start() {
        stoppedByClient = false;
        if (
            socket &&
            (socket.readyState === WebSocket.CONNECTING ||
                socket.readyState === WebSocket.OPEN)
        ) {
            return;
        }

        let socketUrl = "";
        try {
            socketUrl = buildSocketUrl();
        } catch (error) {
            options.onError?.(toError(error, "WS_URL_BUILD_FAILED"));
            return;
        }

        setStatus("connecting");
        activeSubscriptions.clear();
        const connection = new WebSocket(socketUrl);
        socket = connection;

        connection.onopen = () => {
            if (socket !== connection) {
                return;
            }
            setStatus("open");
            applySubscriptionDiff();
        };

        connection.onmessage = (message: { data?: unknown }) => {
            if (socket !== connection) {
                return;
            }
            handleMessage(message.data);
        };

        connection.onerror = () => {
            if (socket !== connection) {
                return;
            }
            options.onError?.(new Error("WS_CONNECTION_ERROR"));
        };

        connection.onclose = (event: {
            code?: number;
            reason?: string;
            wasClean?: boolean;
        }) => {
            if (socket !== connection) {
                return;
            }
            socket = null;
            clearHeartbeat();
            activeSubscriptions.clear();
            setStatus("closed");
            options.onClose?.({
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean,
                byClient: stoppedByClient,
            });
        };
    }

    function stop() {
        stoppedByClient = true;
        desiredSubscriptions.clear();
        activeSubscriptions.clear();
        clearHeartbeat();

        const connection = socket;
        socket = null;
        if (
            connection &&
            (connection.readyState === WebSocket.CONNECTING ||
                connection.readyState === WebSocket.OPEN)
        ) {
            connection.close(1000, "client_stop");
        }
        setStatus("closed");
    }

    function setDesiredSubscriptions(conversationIds: string[]) {
        desiredSubscriptions = new Set(
            conversationIds.filter(
                (id): id is string => typeof id === "string" && id.length > 0,
            ),
        );
        applySubscriptionDiff();
    }

    return {
        start,
        stop,
        setDesiredSubscriptions,
        getStatus: () => status,
    };
}
