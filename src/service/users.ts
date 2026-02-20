import { User } from "../domain/types";

export const searchUsers = async ({
  limit = 10,
}: {
  limit?: number;
}): Promise<User[]> => {
  return Promise.resolve([
    {
      id: "1",
      username: "userA",
      displayName: "User A",
      avatar:
        "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%2Fid%2FOIP.ZtfaXect2blxlNe7ShihDAHaHa%3Fpid%3DApi&f=1&ipt=25170e7b373695d24892355509e5d0cc4c3f84c273690a33947921774530366e&ipo=images",
      createdAt: Date.now(),
    },
    {
      id: "2",
      username: "userB",
      displayName: "User B",
      avatar:
        "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse4.mm.bing.net%2Fth%2Fid%2FOIP.6Gdj0-9A-YS6J7m5jH6UOgHaHa%3Fpid%3DApi&f=1&ipt=8c5c0cdf7ac62d48f71be331fbc632ec3a5e0b7b4db60b11374307525ab4c0c8&ipo=images",
      createdAt: Date.now(),
    },
  ]);
};
