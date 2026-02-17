import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/mathjs-client", () => ({
	evaluateExpression: vi.fn(async (expr: string) => {
		return new Function(`return (${expr})`)() as number;
	}),
}));

import { getDifficulty, generateEquation } from "@/lib/equation-generator";

describe("getDifficulty", () => {
	it("returns easy for rounds 1-3", () => {
		expect(getDifficulty(1)).toBe("easy");
		expect(getDifficulty(2)).toBe("easy");
		expect(getDifficulty(3)).toBe("easy");
	});

	it("returns medium for rounds 4-7", () => {
		expect(getDifficulty(4)).toBe("medium");
		expect(getDifficulty(5)).toBe("medium");
		expect(getDifficulty(7)).toBe("medium");
	});

	it("returns hard for rounds 8+", () => {
		expect(getDifficulty(8)).toBe("hard");
		expect(getDifficulty(10)).toBe("hard");
		expect(getDifficulty(20)).toBe("hard");
	});
});

describe("generateEquation", () => {
	let randomSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		randomSpy = vi.spyOn(Math, "random");
	});

	afterEach(() => {
		randomSpy.mockRestore();
	});

	it("generates a valid easy equation (addition)", async () => {
		randomSpy
			.mockReturnValueOnce(4 / 20)
			.mockReturnValueOnce(9 / 20)
			.mockReturnValueOnce(0);

		const result = await generateEquation("easy");
		expect(result.text).toBe("5 + 10");
		expect(result.answer).toBe(15);
	});

	it("generates a valid easy equation (subtraction)", async () => {
		randomSpy
			.mockReturnValueOnce(11 / 20)
			.mockReturnValueOnce(6 / 20)
			.mockReturnValueOnce(0.99);

		const result = await generateEquation("easy");
		expect(result.text).toBe("12 - 7");
		expect(result.answer).toBe(5);
	});

	it("generates a valid medium equation", async () => {
		randomSpy
			.mockReturnValueOnce(2 / 3)
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(1 / 11)
			.mockReturnValueOnce(2 / 11)
			.mockReturnValueOnce(3 / 11);

		const result = await generateEquation("medium");
		expect(result.text).toBe("3 * 4 + 5");
		expect(result.answer).toBe(17);
	});

	it("generates a valid hard equation", async () => {
		randomSpy
			.mockReturnValueOnce(3 / 9)
			.mockReturnValueOnce(1 / 8)
			.mockReturnValueOnce(6 / 15);

		const result = await generateEquation("hard");
		expect(result.text).toBe("(5 + 7) * 3");
		expect(result.answer).toBe(36);
	});

	it("equation answer matches local evaluation", async () => {
		const result = await generateEquation("easy");
		const evaluated = new Function(`return (${result.text})`)() as number;
		expect(result.answer).toBe(evaluated);
	});
});
