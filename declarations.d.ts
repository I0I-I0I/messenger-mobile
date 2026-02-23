declare module "*.svg" {
    import React from "react";
    import { SvgProps } from "react-native-svg";
    const content: React.FC<SvgProps>;
    export default content;
}

declare module "expo-secure-store" {
    export function getItemAsync(
        key: string,
        options?: Record<string, unknown>,
    ): Promise<string | null>;
    export function setItemAsync(
        key: string,
        value: string,
        options?: Record<string, unknown>,
    ): Promise<void>;
    export function deleteItemAsync(
        key: string,
        options?: Record<string, unknown>,
    ): Promise<void>;
}
