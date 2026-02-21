const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath =
    require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter(
    (ext) => ext !== "svg",
);
if (!config.resolver.assetExts.includes("wasm")) {
    config.resolver.assetExts.push("wasm");
}

config.resolver.sourceExts.push("svg");
config.server.enhanceMiddleware = (middleware) => {
    return (req, res, next) => {
        res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        middleware(req, res, next);
    };
};

module.exports = config;
