import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateLocally, evaluateExpression } from "@/lib/mathjs-client";

describe("evaluateLocally", () => {
	it("evaluates simple addition", () => {
		expect(evaluateLocally("2 + 3")).toBe(5);
	});

	it("evaluates operator precedence", () => {
		expect(evaluateLocally("2 + 3 * 4")).toBe(14);
	});

	it("evaluates parentheses", () => {
		expect(evaluateLocally("(2 + 3) * 4")).toBe(20);
	});

	it("evaluates subtraction", () => {
		expect(evaluateLocally("10 - 7")).toBe(3);
	});

	it("throws on non-numeric result", () => {
		expect(() => evaluateLocally("'hello'")).toThrow("Local evaluation failed");
	});
});

describe("evaluateExpression", () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns result from MathJS API on success", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => "42",
		});

		const result = await evaluateExpression("6 * 7");
		expect(result).toBe(42);
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][0]).toContain("6%20*%207");
	});

	it("falls back to local evaluation on fetch error", async () => {
		fetchMock.mockRejectedValueOnce(new Error("Network error"));

		const result = await evaluateExpression("3 + 4");
		expect(result).toBe(7);
	});

	it("falls back to local evaluation on non-ok response", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			text: async () => "Internal Server Error",
		});

		const result = await evaluateExpression("10 - 2");
		expect(result).toBe(8);
	});

	it("falls back to local evaluation on NaN API response", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => "not a number",
		});

		const result = await evaluateExpression("5 + 5");
		expect(result).toBe(10);
	});
});
