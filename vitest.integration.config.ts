import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		include: ["src/**/*.integration.test.ts"],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		pool: "forks",
		isolate: false,
		globalSetup: "./src/test-utils/global-setup.ts",
		setupFiles: ["./src/test-utils/integration-vitest-setup.ts"],
	},
});
