import type { Theme as NavigationTheme } from "@react-navigation/native";

export type ThemeName = "light" | "dark";
export type Mode = "light" | "dark" | "system";

export type AppTheme = {
    name: ThemeName;
    dark: boolean;
    colors: {
        background: string;
        surface: string;
        text: string;
        mutedText: string;
        primary: string;
        border: string;
        card: string;
        notification: string;
    };
};

export const lightTheme: AppTheme = {
    name: "light",
    dark: false,
    colors: {
        background: "#f3f4f6",
        surface: "#ffffff",
        text: "#111827",
        mutedText: "#6b7280",
        primary: "#1f6feb",
        border: "#d1d5db",
        card: "#ffffff",
        notification: "#ef4444",
    },
};

export const darkTheme: AppTheme = {
    name: "dark",
    dark: true,
    colors: {
        background: "#0f172a",
        surface: "#111827",
        text: "#f9fafb",
        mutedText: "#94a3b8",
        primary: "#60a5fa",
        border: "#334155",
        card: "#1f2937",
        notification: "#f87171",
    },
};

export function toNavTheme(appTheme: AppTheme): NavigationTheme {
    return {
        dark: appTheme.dark,
        colors: {
            primary: appTheme.colors.primary,
            background: appTheme.colors.background,
            card: appTheme.colors.card,
            text: appTheme.colors.text,
            border: appTheme.colors.border,
            notification: appTheme.colors.notification,
        },
        fonts: {
            regular: {
                fontFamily: "System",
                fontWeight: "400",
            },
            medium: {
                fontFamily: "System",
                fontWeight: "500",
            },
            bold: {
                fontFamily: "System",
                fontWeight: "700",
            },
            heavy: {
                fontFamily: "System",
                fontWeight: "800",
            },
        },
    };
}
