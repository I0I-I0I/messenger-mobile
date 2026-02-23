export type ApiSuccessEnvelope<T> = {
    data: T;
};

export type ApiErrorBody = {
    code: string;
    message: string;
    details?: unknown;
};

export type ApiErrorEnvelope = {
    error: ApiErrorBody;
};

export type AuthTokensDto = {
    access_token?: string;
    accessToken?: string;
    refresh_token?: string;
    refreshToken?: string;
};

export type ApiUserDto = {
    id: string;
    username?: string;
    display_name?: string;
    displayName?: string;
    avatar_url?: string;
    avatar?: string | null;
    created_at?: string | number;
    createdAt?: string | number;
    updated_at?: string | number;
    updatedAt?: string | number;
};

export type AuthResponseDto = {
    user: ApiUserDto;
    tokens: AuthTokensDto;
};

export type ConversationDto = {
    id: string;
    type?: string;
    user_a?: string;
    userA?: string;
    user_b?: string;
    userB?: string;
    members?: Array<ApiUserDto | { id: string }>;
    users?: Array<ApiUserDto | { id: string }>;
    participants?: Array<ApiUserDto | { id: string }>;
    participant_users?: Array<ApiUserDto | { id: string }>;
    participantUsers?: Array<ApiUserDto | { id: string }>;
    member_ids?: string[];
    participant_ids?: string[];
    other_user?: ApiUserDto | { id: string } | null;
    otherUser?: ApiUserDto | { id: string } | null;
    peer?: ApiUserDto | { id: string } | null;
    counterpart?: ApiUserDto | { id: string } | null;
    other_user_id?: string;
    created_at?: string | number;
    createdAt?: string | number;
    updated_at?: string | number;
    updatedAt?: string | number;
    last_message_preview?: string;
    lastMessagePreview?: string;
    last_message_at?: string | number;
    lastMessageAt?: string | number;
    unread_count?: number;
    unreadCount?: number;
};

export type MessageDto = {
    id: string;
    conversation_id?: string;
    conversationId?: string;
    sender_id?: string;
    senderId?: string;
    client_message_id?: string;
    clientMessageId?: string;
    seq?: number;
    content?: string;
    created_at?: string | number;
    createdAt?: string | number;
    sender?: ApiUserDto | { id: string };
    sender_user?: ApiUserDto | { id: string };
    senderUser?: ApiUserDto | { id: string };
    author?: ApiUserDto | { id: string };
    from_user?: ApiUserDto | { id: string };
    fromUser?: ApiUserDto | { id: string };
    sender_username?: string;
    senderUsername?: string;
    sender_display_name?: string;
    senderDisplayName?: string;
    sender_name?: string;
    senderName?: string;
    sender_avatar_url?: string | null;
    senderAvatarUrl?: string | null;
    sender_avatar?: string | null;
    senderAvatar?: string | null;
    sender_created_at?: string | number;
    senderCreatedAt?: string | number;
    sender_updated_at?: string | number;
    senderUpdatedAt?: string | number;
};

export type BootstrapDto = {
    me?: ApiUserDto;
    user?: ApiUserDto;
    users?: ApiUserDto[];
    conversations?: ConversationDto[];
    recent_messages?: MessageDto[];
    recentMessages?: MessageDto[];
};

export type SyncChangesDto = {
    users?: ApiUserDto[];
    conversations?: ConversationDto[];
    messages?: MessageDto[];
};
