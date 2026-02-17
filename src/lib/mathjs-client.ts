const MATHJS_BASE_URL = "https://api.mathjs.org/v4/";

export class MathJsError extends Error {
	constructor(
		message: string,
		public readonly expression: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = "MathJsError";
	}
}

// this is a fallback if the mathjs api fails
export function evaluateLocally(expression: string): number {
	// js eval / function can be dangerous, but we only give it strings generated in this codebase, not user input
	const result = new Function(`return (${expression})`)() as number;
	if (typeof result !== "number" || Number.isNaN(result)) {
		throw new Error(`Local evaluation failed for: "${expression}"`);
	}
	return result;
}

export async function evaluateExpression(expression: string): Promise<number> {
	const encoded = encodeURIComponent(expression);
	const url = `${MATHJS_BASE_URL}?expr=${encoded}`;

	try {
		const response = await fetch(url, { cache: "no-store" });

		if (response.ok) {
			const text = await response.text();
			const result = parseFloat(text.trim());
			if (!Number.isNaN(result)) {
				return result;
			}
		}
	} catch {
		// mathjs unavailable — fall through to local evaluation
	}

	return evaluateLocally(expression);
}
