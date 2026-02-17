# Math Sprint

Multiplayer math game using Next.js, TypeScript, Prisma, PostgreSQL.

App is currently deployed on: https://math-sprint-nine.vercel.app/

## Prerequisites

- Node.js 22+
- PostgreSQL (Neon or local)
- Docker (for integration tests)

## Install

```
npm install
```

## Environment

Create `.env`:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

Note: the above is just an example, you'll have to have your own instance to run this locally

## Database

```
npx prisma generate
npx prisma migrate deploy
```

## Run locally

```
npm run dev
```

## Lint

```
npm run lint
```

## Unit tests

```
npm run test:unit
```

## Integration tests

```
docker compose -f docker-compose.test.yml up -d
npm run test:integration
```

## Build

```
npm run build
```

## Rubric items

Below are the rubric items and how I satisfied each with this project.

### Web application basic form, reporting

- `src/app/page.tsx`: game creation/join form
- `src/app/game/[gameCode]/page.tsx`: gameplay UI with answer submission
- `src/app/stats/page.tsx`: analytics dashboard with leaderboards, round difficulty, recent games

### Data collection

- `src/repositories/game-repository.ts` writes Game, Player, Round, Submission, GameEvent records using Prisma
- Every answer submission, round outcome, and game event is persisted in the database

### Data analyzer

- `src/repositories/analytics-repository.ts` aggregates queries to determine accuracy percentage, fail rates, scores, and leaderboards
- `src/services/analytics-service.ts` creates dashboard from 5 parallel queries
- `src/app/stats/page.tsx` displays computed stats at `/stats`

### Unit tests

- `src/services/__tests__/game-service.test.ts`
- `src/services/__tests__/scoring-service.test.ts`
- `src/services/__tests__/analytics-service.test.ts`
- `src/lib/__tests__/equation-generator.test.ts`
- `src/lib/__tests__/mathjs-client.test.ts`
- `src/lib/__tests__/metrics.test.ts`

### Data persistence any data store

- Neon PostgreSQL through Prisma 6
- Schema is in `prisma/schema.prisma` with Game, Player, Round, Submission, GameEvent tables

### Rest collaboration internal or API endpoint

- `src/app/api/games/route.ts`: POST create game
- `src/app/api/games/[gameCode]/join/route.ts`: POST join
- `src/app/api/games/[gameCode]/start/route.ts`: POST start
- `src/app/api/games/[gameCode]/rounds/[roundNumber]/submit/route.ts`: POST submit answer
- `src/app/api/games/[gameCode]/state/route.ts`: GET game state
- `src/app/api/games/[gameCode]/report/route.ts`: GET game report
- `src/app/api/analytics/route.ts`: GET analytics dashboard
- `src/app/api/monitoring/metrics/route.ts`: GET runtime metrics
- Uses external API `https://api.mathjs.org/v4/` for equation evaluation in `src/lib/mathjs-client.ts`

### Product environment

- Vercel auto deploys from `main` branch to https://math-sprint-nine.vercel.app/
- Uses Neon PostgreSQL production database

### Integration tests

- `src/services/__tests__/game-service.integration.test.ts`
- Runs with PostgreSQL using Docker with `docker-compose.test.yml`
- `src/test-utils/global-setup.ts` runs migrations and `src/test-utils/integration-vitest-setup.ts` truncates tables between tests

### Using mock objects or any test doubles

- `vi.mock("@/repositories/game-repository")` in `game-service.test.ts` has a full module mock with `Mock` type cast
- `vi.mock("@/repositories/analytics-repository")` in `analytics-service.test.ts`
- `vi.mock("@/lib/mathjs-client")` in `equation-generator.test.ts`
- `vi.stubGlobal("fetch", ...)` in `mathjs-client.test.ts`
- `vi.spyOn(Math, "random")` in `equation-generator.test.ts`
- `vi.useFakeTimers()` in `game-service.test.ts`

### Continuous integration

- `.github/workflows/ci.yml` has jobs that lint, run unit tests, and run integration tests with a PostgreSQL service container

### Production monitoring instrumenting

- `src/lib/metrics.ts` has counters stored in memory for games, rounds, submissions, errors, and average round duration
- Instrumented in `src/services/game-service.ts` and all API route catch blocks
- `src/app/api/monitoring/metrics/route.ts`: GET endpoint
- `src/app/monitoring/page.tsx` has a dashboard at `/monitoring` that refreshes automatically every 10 seconds

### Event collaboration messaging

- `src/app/api/games/[gameCode]/events/route.ts`: Server Sent Events (SSE) endpoint
- `src/hooks/useGameEvents.ts`: client side EventSource hook
- Events: PLAYER_JOINED, GAME_STARTED, ROUND_STARTED, ANSWER_SUBMITTED, FIRST_CORRECT, COUNTDOWN_STARTED, ROUND_ENDED, GAME_ENDED
- Stored in GameEvent table and polled using SSE for real time multiplayer sync

### Continuous delivery

- Vercel auto-deploys every push to `main`
- CI must pass before merge using GitHub Actions
