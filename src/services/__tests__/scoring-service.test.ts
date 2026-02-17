import { describe, it, expect } from "vitest";
import { calculateScore } from "@/services/scoring-service";

describe("calculateScore", () => {
	it("returns 0 for incorrect answer", () => {
		expect(
			calculateScore({ isCorrect: false, isFirstCorrect: false, timeTakenMs: 500 }),
		).toBe(0);
	});

	it("returns 0 for incorrect answer even if flagged as first correct", () => {
		expect(
			calculateScore({ isCorrect: false, isFirstCorrect: true, timeTakenMs: 100 }),
		).toBe(0);
	});

	it("returns 100 base points for correct answer with no time", () => {
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: false, timeTakenMs: undefined }),
		).toBe(100);
	});

	it("adds 25 first-correct bonus", () => {
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: true, timeTakenMs: undefined }),
		).toBe(125);
	});

	it("adds speed bonus: 50 - floor(ms/200)", () => {
		// 1000ms → 50 - floor(1000/200) = 50 - 5 = 45
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: false, timeTakenMs: 1000 }),
		).toBe(145);
	});

	it("clamps speed bonus at 0 for slow answers", () => {
		// 20000ms → 50 - floor(20000/200) = 50 - 100 = -50 → clamped to 0
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: false, timeTakenMs: 20_000 }),
		).toBe(100);
	});

	it("gives maximum speed bonus at 0ms", () => {
		// 0ms → 50 - floor(0/200) = 50
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: false, timeTakenMs: 0 }),
		).toBe(150);
	});

	it("combines all bonuses: base + first-correct + speed", () => {
		// 400ms → speed = 50 - floor(400/200) = 50 - 2 = 48
		// total = 100 + 25 + 48 = 173
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: true, timeTakenMs: 400 }),
		).toBe(173);
	});

	it("speed bonus at exact boundary: 10_000ms → 0", () => {
		// 10000ms → 50 - floor(10000/200) = 50 - 50 = 0
		expect(
			calculateScore({ isCorrect: true, isFirstCorrect: false, timeTakenMs: 10_000 }),
		).toBe(100);
	});
});
