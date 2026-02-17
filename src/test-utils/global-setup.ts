import { execSync } from "child_process";

export default function globalSetup() {
	const databaseUrl =
		process.env.DATABASE_URL ??
		"postgresql://test:test@localhost:5433/mathsprint_test";

	// Run prisma migrate deploy against the test database
	execSync("npx prisma migrate deploy", {
		env: { ...process.env, DATABASE_URL: databaseUrl },
		stdio: "inherit",
	});
}
