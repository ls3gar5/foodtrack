# Project Structure

## Monorepo Layout (Nx)

```
foodtrack/
├── .kiro/
│   └── steering/       # AI assistant guidance docs
├── .vscode/
│   └── settings.json   # Editor settings (Snyk config)
├── apps/
│   ├── front/        # Primary React native (food ordering, payments)
│   ├── bff/          # Primary REST API service (food ordering, payments)
│   ├── back/         # Secondary service (device management)
│   └── rest/         # HTTP request files for manual API testing
├── modules/          # Shared libraries (Nx libsDir)
├── dist/             # Build output (dist/apps/bff, dist/apps/back)
├── coverage/         # Test coverage reports
├── nx.json           # Nx workspace configuration
├── package.json      # Root dependencies and scripts
├── tsconfig.base.json# Shared TypeScript config
├── docker-compose.yml# Local dev services (Postgres, Unleash)
└── .gitlab-ci.yml    # CI/CD pipeline

```

## Application Services

### `apps/front/` — FRONT Service

#### Core

- **React 18** with TypeScript (strict)
- **Ejected Create React App** with custom Webpack 5 config
- **React Router v6** (createBrowserRouter, lazy-loaded routes)
- **React Query v3** for server state / data fetching
- **Axios** for HTTP requests (custom instance factory with auth interceptors)
- **Native Base** as component library (React Native Web compatibility layer)
- **Tailwind CSS** for utility styling
- **Node 18.16.0** (see `.nvmrc`)

#### Notable Libraries

- `react-native-web` — cross-platform component compatibility
- `@personalpay/platform-app-webview` — webview bridge SDK
- `@ppay-mobile/platform-checkout-sdk` — checkout SDK
- `@dynatrace/openkit-js` — observability
- `jwt-decode` — token handling
- `qr-code-styling` — QR code generation
- `libphonenumber-js` — phone number formatting
- `universal-cookie` — cookie management
- `uuid` — unique ID generation

```
apps/bff/src/
├── controllers/      # HTTP endpoint handlers
├── services/         # Business logic layer
├── dto/              # Data Transfer Objects (request/response validation)
├── handler/          # Custom exception classes and error handlers
├── queues/           # BullMQ queue definitions and processors
├── utils/            # Utility functions
├── config/           # App configuration and environment setup
├── constants/        # Payment flow and validation configs
├── docs/             # API documentation
├── app.module.ts     # Root module
├── app.options.ts    # Swagger configuration
└── main.ts           # Bootstrap entry point
```

### `apps/bff/` — API Service

User-facing REST API for food ordering and payment processing.

```
apps/bff/src/
├── controllers/      # HTTP endpoint handlers
├── services/         # Business logic layer
├── dto/              # Data Transfer Objects (request/response validation)
├── handler/          # Custom exception classes and error handlers
├── queues/           # BullMQ queue definitions and processors
├── utils/            # Utility functions
├── config/           # App configuration and environment setup
├── constants/        # Payment flow and validation configs
├── docs/             # API documentation
├── app.module.ts     # Root module
├── app.options.ts    # Swagger configuration
└── main.ts           # Bootstrap entry point
```

### `apps/back/` — Backend Service

Internal service for payment operations and device management.

```
apps/back/src/
├── controllers/      # HTTP endpoints (BNPL, device, payment, health)
├── services/         # Business logic (BNPL, health checks)
├── entities/         # TypeORM database entities
├── interceptor/      # Request interceptors (device detection)
├── types/            # TypeScript type definitions
├── utils/            # Cache handling services
├── config/           # Service configuration
├── app.module.ts     # Root module
└── main.ts           # Bootstrap entry point
```

### `apps/rest/` — API Testing

Manual HTTP request files (`api.http`, `back.http`) for testing endpoints.

## Architectural Patterns

- **Layered architecture**: Controllers → Services → Entities/DTOs
- **NestJS module system**: Each feature is a self-contained module using `forRoot()` for configuration
- **Constructor-based DI**: All services injected via `private readonly` constructors
- **Barrel exports**: `index.ts` files for cleaner imports from directories

## Nx Project Configuration

Each app has a `project.json` defining targets:
- `build` — Webpack build (output to `dist/apps/<name>`)
- `serve` — Dev server via `@nx/js:node`
- `lint` — ESLint
- `test` — Jest

## Code Style Conventions

- No semicolons
- Single quotes
- 2-space indentation
- Trailing commas in multiline
- PascalCase for classes, camelCase for methods/variables
- snake_case for database column names (mapped via TypeORM decorators)
- Test files adjacent to source: `*.spec.ts`
- Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) required on all controller endpoints
