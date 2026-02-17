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
