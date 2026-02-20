import { Message } from "../domain/types";

export const getListMessages = async ({
  chatId,
}: {
  chatId: string;
}): Promise<Message[]> => {
  return Promise.resolve([
    {
      id: "1",
      chatId: "1",
      senderId: "userA",
      content: "Hello!",
      createdAt: Date.now(),
    },
    {
      id: "2",
      chatId: "1",
      senderId: "userB",
      content: "Hi!",
      createdAt: Date.now(),
    },
  ]);
};

export const sendMessage = async ({
  chatId,
  senderId,
  content,
}: {
  chatId: string;
  senderId: string;
  content: string;
}): Promise<Message> => {
  return Promise.resolve({
    id: "3",
    chatId,
    senderId,
    content,
    createdAt: Date.now(),
  });
};
