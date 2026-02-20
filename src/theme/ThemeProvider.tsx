import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Theme as NavigationTheme } from "@react-navigation/native";
import { Appearance, ColorSchemeName } from "react-native";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    darkTheme,
    lightTheme,
    Mode,
    type AppTheme,
    type ThemeName,
    toNavTheme,
} from "@/src/theme/themes";

type ThemeContextValue = {
    theme: AppTheme;
    navTheme: NavigationTheme;
    mode: Mode;
    effectiveTheme: ThemeName;
    setMode: (mode: Mode) => void;
    toggle: () => void;
};

const STORAGE_KEY = "theme.mode.v1";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeScheme(scheme: ColorSchemeName): ThemeName {
    return scheme === "dark" ? "dark" : "light";
}

export function resolveTheme(mode: Mode, systemScheme: ThemeName): ThemeName {
    if (mode === "system") {
        return systemScheme;
    }
    return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [modeState, setModeState] = useState<Mode>("system");
    const [systemScheme, setSystemScheme] = useState<ThemeName>(() =>
        normalizeScheme(Appearance.getColorScheme()),
    );

    const persistMode = useCallback(async (nextMode: Mode) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, nextMode);
        } catch {
            // Ignore storage errors and continue with in-memory mode.
        }
    }, []);

    useEffect(() => {
        let active = true;

        void (async () => {
            try {
                const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
                if (!active) {
                    return;
                }

                if (
                    storedMode === "light" ||
                    storedMode === "dark" ||
                    storedMode === "system"
                ) {
                    setModeState(storedMode);
                }
            } catch {
                // Ignore read errors and keep default mode.
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const subscription = Appearance.addChangeListener((preferences) => {
            setSystemScheme(normalizeScheme(preferences.colorScheme));
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const setMode = useCallback(
        (nextMode: Mode) => {
            setModeState(nextMode);
            void persistMode(nextMode);
        },
        [persistMode],
    );

    const effectiveTheme = resolveTheme(modeState, systemScheme);
    const theme = effectiveTheme === "dark" ? darkTheme : lightTheme;

    const navTheme = useMemo(() => toNavTheme(theme), [theme]);

    const toggle = useCallback(() => {
        const nextMode = effectiveTheme === "dark" ? "light" : "dark";
        setMode(nextMode);
    }, [effectiveTheme, setMode]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            navTheme,
            mode: modeState,
            effectiveTheme,
            setMode,
            toggle,
        }),
        [effectiveTheme, modeState, navTheme, setMode, theme, toggle],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}
