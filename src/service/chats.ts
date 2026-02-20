import { Chat, ChatListItem } from "../domain/types";

export const getChatsForUser = ({
  userId,
}: {
  userId: string;
}): Promise<ChatListItem[]> => {
  return Promise.resolve([
    {
      chat: {
        id: "1",
        userA: "userA",
        userB: "userB",
        createdAt: Date.now(),
      },
      otherUser: {
        id: "1",
        username: "username",
        displayName: "displayName",
        avatar:
          "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%2Fid%2FOIP.ZtfaXect2blxlNe7ShihDAHaHa%3Fpid%3DApi&f=1&ipt=25170e7b373695d24892355509e5d0cc4c3f84c273690a33947921774530366e&ipo=images",
        createdAt: Date.now(),
      },
      lastMessage: {
        id: "1",
        chatId: "1",
        senderId: "1",
        content: "body",
        createdAt: Date.now(),
      },
    },
  ]);
};

export const getChatById = ({ chatId }: { chatId: string }): Promise<Chat> => {
  return Promise.resolve({
    id: "1",
    userA: "userA",
    userB: "userB",
    createdAt: Date.now(),
  });
};

export const findOrCreateDirectChat = async ({
  currentUserId,
  otherUserId,
}: {
  currentUserId: string;
  otherUserId: string;
}): Promise<Chat> => {
  return Promise.resolve({
    id: "1",
    userA: "userA",
    userB: "userB",
    createdAt: Date.now(),
  });
};
