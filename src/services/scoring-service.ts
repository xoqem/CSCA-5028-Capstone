export function calculateScore(input: {
  isCorrect: boolean;
  isFirstCorrect: boolean;
  timeTakenMs: number | undefined;
}): number {
  if (!input.isCorrect) return 0;

  let score = 100;

  if (input.isFirstCorrect) {
    score += 25;
  }

  if (input.timeTakenMs !== undefined) {
    score += Math.max(0, 50 - Math.floor(input.timeTakenMs / 200));
  }

  return score;
}
