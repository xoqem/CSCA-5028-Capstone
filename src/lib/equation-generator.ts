import { evaluateExpression } from "./mathjs-client";

export type Difficulty = "easy" | "medium" | "hard";

export interface GeneratedEquation {
  text: string;
  answer: number;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildExpression(difficulty: Difficulty): string {
  switch (difficulty) {
    case "easy": {
      const a = randomInt(1, 20);
      const b = randomInt(1, 20);
      const op = ["+", "-"][randomInt(0, 1)];
      return `${a} ${op} ${b}`;
    }
    case "medium": {
      const ops = ["+", "-", "*"];
      const op1 = ops[randomInt(0, 2)];
      const op2 = ops[randomInt(0, 2)];
      const x = randomInt(2, 12);
      const y = randomInt(2, 12);
      const z = randomInt(2, 12);
      return `${x} ${op1} ${y} ${op2} ${z}`;
    }
    case "hard": {
      const base = randomInt(2, 10);
      const mult = randomInt(2, 9);
      const add = randomInt(1, 15);
      return `(${base} + ${add}) * ${mult}`;
    }
  }
}

export function getDifficulty(roundNumber: number): Difficulty {
  if (roundNumber <= 3) return "easy";
  if (roundNumber <= 7) return "medium";
  return "hard";
}

export async function generateEquation(
  difficulty: Difficulty = "easy",
): Promise<GeneratedEquation> {
  const text = buildExpression(difficulty);
  const answer = await evaluateExpression(text);
  return { text, answer };
}
