/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    clearMocks: true,
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    testMatch: ["**/*.test.ts"],
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/tsconfig.json",
            },
        ],
    },
    modulePathIgnorePatterns: ["<rootDir>/.expo/"],
};
