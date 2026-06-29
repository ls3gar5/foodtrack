# Tech Stack

## Runtime & Language

- **Node.js ≥22.0.0** (production images: `node:22.15.0-alpine3.21`)
- **TypeScript 5.7** — strict decorators, ES2015 target, ESNext modules
- **NestJS 11** — core framework


## Build System

- **Nx 21** — monorepo orchestration, task caching, project graph
- **Webpack** — production bundler (via `@nx/webpack`)
- **SWC** — fast TypeScript compilation
- **Yarn Classic 1.22** — package manager

## Key Libraries

| Category | Library |
|----------|---------|
| HTTP | `@nestjs/platform-express`, `axios` |
| Database | `TypeORM 0.3`, `pg` (PostgreSQL) |
| Caching | `redis` |
| Queues | `BullMQ` via `@nestjs/bullmq` |
| Validation | `class-validator`, `class-transformer` |
| Auth | `jsonwebtoken` |
| API Docs | `@nestjs/swagger` (OpenAPI) |
| Testing | `Jest 29`, `supertest`, `ts-jest` |
| Linting | `ESLint 9`, `Prettier` |


## Infrastructure

- **PostgreSQL** — primary database
- **Redis** — caching and BullMQ job queue backend
- **Unleash** — feature flag server
- **Docker Compose** — local development orchestration
- **GitLab CI** — CI/CD (shared pipeline from `cicd-regional`)

## Common Commands

```bash
# Development — run all services in parallel
yarn dev

# Build all projects
yarn build

# Lint all projects
yarn lint

# Run all tests
yarn test

# Unit tests only
yarn test:unit

# E2E tests only
yarn test:e2e

# Test with coverage
yarn test:coverage

# Run a single project target
npx nx <target> <project>   # e.g., npx nx serve api, npx nx test back

# View dependency graph
npx nx graph
```