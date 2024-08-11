export default {
  // Your Jest configuration here
  // e.g., preset: 'ts-jest',
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js"],
  testMatch: ["**/*.spec.ts"],
  rootDir: "./src",
  watchman: false,
};
