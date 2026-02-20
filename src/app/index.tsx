import { Redirect } from "expo-router";

import { SessionState, useSessionStore } from "@/src/state/useSessionStore";

export default function Index() {
  const userId = useSessionStore((state: SessionState) => state.userId);

  return <Redirect href="/(auth)/login" />;
}
