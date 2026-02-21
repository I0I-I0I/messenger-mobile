import { router, type Href } from "expo-router";

export function backOrReplace(href: Href) {
    if (router.canGoBack()) {
        router.back();
        return;
    }

    router.replace(href);
}

export function replaceToLogin() {
    router.replace("/(auth)/login");
}
