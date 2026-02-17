import { beforeEach, afterAll, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const TEST_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://test:test@localhost:5433/mathsprint_test";

const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
const adapter = new PrismaPg(pool);
const testPrisma = new PrismaClient({ adapter });

// Mock the prisma singleton so all repository code uses our test client
vi.mock("@/lib/prisma", () => ({
	prisma: testPrisma,
}));

// Mock the equation generator to avoid calling MathJS API
vi.mock("@/lib/equation-generator", async () => {
	const actual = await vi.importActual<typeof import("@/lib/equation-generator")>(
		"@/lib/equation-generator",
	);
	return {
		...actual,
		generateEquation: vi.fn(async () => ({ text: "2 + 2", answer: 4 })),
	};
});

// Truncate all tables before each test
beforeEach(async () => {
	await testPrisma.$executeRawUnsafe(`
		TRUNCATE TABLE "GameEvent", "Submission", "Round", "Player", "Game" CASCADE
	`);
});

afterAll(async () => {
	await testPrisma.$disconnect();
	await pool.end();
});
