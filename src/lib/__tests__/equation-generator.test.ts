import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/mathjs-client", () => ({
	evaluateExpression: vi.fn(async (expr: string) => {
		// use Function-based eval the same way evaluateLocally does
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
		// randomInt(1,20) → 5, randomInt(1,20) → 10, randomInt(0,1) → 0 ("+")
		randomSpy
			.mockReturnValueOnce(4 / 20)  // → floor(4/20 * 20) + 1 = 5
			.mockReturnValueOnce(9 / 20)  // → floor(9/20 * 20) + 1 = 10
			.mockReturnValueOnce(0);       // → 0 → "+"

		const result = await generateEquation("easy");
		expect(result.text).toBe("5 + 10");
		expect(result.answer).toBe(15);
	});

	it("generates a valid easy equation (subtraction)", async () => {
		// randomInt(1,20) → 12, randomInt(1,20) → 7, randomInt(0,1) → 1 ("-")
		randomSpy
			.mockReturnValueOnce(11 / 20) // → 12
			.mockReturnValueOnce(6 / 20)  // → 7
			.mockReturnValueOnce(0.99);   // → 1 → "-"

		const result = await generateEquation("easy");
		expect(result.text).toBe("12 - 7");
		expect(result.answer).toBe(5);
	});

	it("generates a valid medium equation", async () => {
		// randomInt(0,2) → 2 ("*"), randomInt(0,2) → 0 ("+"),
		// randomInt(2,12) → 3, randomInt(2,12) → 4, randomInt(2,12) → 5
		randomSpy
			.mockReturnValueOnce(2 / 3)   // → op1 = "*"
			.mockReturnValueOnce(0)        // → op2 = "+"
			.mockReturnValueOnce(1 / 11)   // → x = 3
			.mockReturnValueOnce(2 / 11)   // → y = 4
			.mockReturnValueOnce(3 / 11);  // → z = 5

		const result = await generateEquation("medium");
		expect(result.text).toBe("3 * 4 + 5");
		expect(result.answer).toBe(17); // 12 + 5
	});

	it("generates a valid hard equation", async () => {
		// randomInt(2,10) → 5, randomInt(2,9) → 3, randomInt(1,15) → 7
		randomSpy
			.mockReturnValueOnce(3 / 9)   // → base = 5
			.mockReturnValueOnce(1 / 8)   // → mult = 3
			.mockReturnValueOnce(6 / 15); // → add = 7

		const result = await generateEquation("hard");
		expect(result.text).toBe("(5 + 7) * 3");
		expect(result.answer).toBe(36);
	});

	it("equation answer matches local evaluation", async () => {
		// run without mocking random — just check text evaluates to answer
		const result = await generateEquation("easy");
		const evaluated = new Function(`return (${result.text})`)() as number;
		expect(result.answer).toBe(evaluated);
	});
});
