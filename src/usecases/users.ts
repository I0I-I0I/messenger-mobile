import { searchUsers } from "@/src/repository/userRepository";

export async function searchUsersByQuery(input: {
    query?: string;
    limit?: number;
}) {
    return searchUsers(input.query ?? "", input.limit ?? 10);
}
