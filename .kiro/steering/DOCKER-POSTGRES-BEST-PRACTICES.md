# Docker + PostgreSQL Best Practices

Steering document for AI-assisted development with Kiro.
Apply these rules whenever working with PostgreSQL running in Docker containers.

---

## Container Configuration

- Always use a **named volume** for data persistence — never rely on the container's writable layer.
- Pin the PostgreSQL image to a specific minor version (e.g. `postgres:16.3-alpine`), not `latest` or a major-only tag.
- Use `alpine`-based images unless you need locale or extension support that requires the Debian image.
- Set `restart: unless-stopped` (or `on-failure`) in Compose — never omit a restart policy for database services.
- Never expose port `5432` on `0.0.0.0` in production; bind to `127.0.0.1:5432` or rely on the Docker network and avoid host binding entirely.

```yaml
# docker-compose.yml — canonical baseline
services:
  postgres:
    image: postgres:16.3-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"   # only if host access is needed
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## Secrets and Environment Variables

- **Never hardcode credentials** in `docker-compose.yml`, `Dockerfile`, or source code.
- Use an `.env` file locally (gitignored) and inject secrets via your CI/CD secret manager in production.
- In production environments prefer Docker secrets or a secrets manager (AWS Secrets Manager, Vault) over environment variables.
- The only variables that should live in `docker-compose.yml` are non-sensitive defaults (e.g. `POSTGRES_DB: myapp`).

```bash
# .env (gitignored)
POSTGRES_USER=appuser
POSTGRES_PASSWORD=change_me_in_prod
POSTGRES_DB=myapp
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

---

## Initialization and Migrations

- Place init SQL or shell scripts in `/docker-entrypoint-initdb.d/` — they run **only on first container start** when the data directory is empty.
- Do **not** rely on `initdb.d` scripts for migrations. Use a proper migration tool (e.g. Flyway, Liquibase, Prisma Migrate, `node-pg-migrate`, Alembic).
- Run migrations as a separate step or init container, not as part of the app startup code path.
- Always run migrations before the application starts — use `depends_on` with `condition: service_healthy` plus a migration service in Compose.

```yaml
services:
  migrate:
    image: your-app:latest
    command: ["npm", "run", "migrate"]
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}

  app:
    image: your-app:latest
    depends_on:
      migrate:
        condition: service_completed_successfully
```

---

## Connection Pooling

- Applications should **never** open unbounded connections to PostgreSQL — use a connection pool.
- For Node.js services use `pg-pool` (built into `pg`) or `pgBouncer` as a sidecar.
- Set `max` pool size based on `max_connections` in PostgreSQL: a safe default is `max_connections / number_of_app_instances - 5` (leave headroom for admin tools).
- Always configure `idleTimeoutMillis` and `connectionTimeoutMillis` — never leave them at infinity.

```typescript
// NestJS / TypeORM example
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  extra: {
    max: 10,                    // pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});
```

---

## Health Checks and Startup Dependencies

- Always define a `healthcheck` on the `postgres` service using `pg_isready`.
- Application services must declare `depends_on` with `condition: service_healthy`, not just `service_started`.
- Add retry/backoff logic in app startup regardless — Docker health checks have a delay window.

---

## Data Safety

- **Never run `docker compose down -v`** in a production environment — this destroys volumes.
- Use `docker compose stop` + `docker compose start` to restart without data loss.
- Tag Compose commands that destroy data with a comment warning in Makefiles or scripts.
- Separate development and production Compose files: `docker-compose.yml` (base) + `docker-compose.override.yml` (dev overrides).

---

## Backups

- Do not treat Docker volumes as a backup strategy — they live on the host's filesystem and are lost with the host.
- Use `pg_dump` for logical backups:

```bash
# Create a dump
docker exec -t postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore
gunzip -c backup.sql.gz | docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

- Automate backups via a scheduled container (cron or a sidecar) and ship them to S3 or equivalent.
- Test restores regularly — an untested backup is not a backup.

---

## Networking

- Place all services on a **named Docker network** — never use the default bridge network in Compose.
- Application services should reach PostgreSQL by **service name** (`postgres`), not `localhost` or `127.0.0.1`.
- Avoid publishing `5432` to the host in production; use `docker exec` or an SSH tunnel for DBA access.

```yaml
networks:
  backend:
    driver: bridge

services:
  postgres:
    networks:
      - backend
  app:
    networks:
      - backend
```

---

## Performance Tuning

These `postgresql.conf` overrides are sensible starting points for a containerized app server. Mount them via a custom config file or `command` overrides:

```yaml
command: >
  postgres
  -c max_connections=100
  -c shared_buffers=256MB
  -c effective_cache_size=768MB
  -c maintenance_work_mem=64MB
  -c checkpoint_completion_target=0.9
  -c wal_buffers=16MB
  -c default_statistics_target=100
  -c random_page_cost=1.1
  -c effective_io_concurrency=200
  -c work_mem=4MB
  -c min_wal_size=1GB
  -c max_wal_size=4GB
```

Adjust `shared_buffers` to ~25% of available container memory. Do not blindly apply production tuning to local dev.

---

## Security Checklist

- [ ] Credentials are in `.env` or secrets manager, never in version control.
- [ ] `POSTGRES_HOST_AUTH_METHOD` is **not** set to `trust` in any environment.
- [ ] Port `5432` is not exposed on `0.0.0.0` in any environment.
- [ ] The app connects as a **non-superuser** with only the permissions it needs.
- [ ] SSL is enforced for connections in staging and production.
- [ ] PostgreSQL image version is pinned and updated on a regular schedule.
- [ ] Unused extensions are not installed.

---

## Local Development Shortcuts

```bash
# Connect to psql inside the container
docker exec -it postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Tail PostgreSQL logs
docker logs -f postgres

# Force-recreate only the database container without touching volumes
docker compose up -d --force-recreate --no-deps postgres

# Reset the database (destructive — dev only)
docker compose down -v && docker compose up -d postgres
```

---

## Anti-patterns to Avoid

| Anti-pattern | Why | What to do instead |
|---|---|---|
| `image: postgres:latest` | Unpredictable upgrades | Pin to `postgres:16.3-alpine` |
| Hardcoded passwords in Compose | Secret leakage | Use `.env` / secrets manager |
| `POSTGRES_HOST_AUTH_METHOD: trust` | No authentication | Remove it; set a real password |
| App connecting as `postgres` superuser | Blast radius on SQL injection | Create a least-privilege app user |
| `down -v` in scripts without warning | Silent data loss | Add a warning comment; use `stop` |
| Migrations inside app `main()` | Race conditions at scale | Separate migration service/job |
| No `healthcheck` | Race conditions at startup | Always define `pg_isready` check |
| Unbounded connection pool | PostgreSQL connection exhaustion | Set explicit `max` and timeouts |