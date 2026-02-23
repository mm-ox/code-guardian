# Code Guardian – Security Vulnerability Scanner

## Quick Start

```bash
docker-compose up
```

| Service   | URL                           |
| --------- | ----------------------------- |
| Dashboard | http://localhost:4200         |
| API       | http://localhost:3000         |
| Swagger   | http://localhost:3000/swagger |

### Development (without Docker)

```bash
pnpm install
pnpm nx run api:dev          # localhost:3000
pnpm nx run scanner:dev      # localhost:3001
pnpm nx run dashboard:dev    # localhost:4200
```

Scanner requires [Trivy](https://trivy.dev/) installed locally, or it falls back to running Trivy via Docker.

## Project Structure

```
apps/
├── api/          NestJS – orchestration, scan lifecycle, result parsing
├── scanner/      Express – runs Trivy scans on cloned repositories
├── dashboard/    React + Vite – UI for submitting and viewing scans
└── e2e/          Integration tests (Jest)
```

## Design Decisions

- Separating the scanner into a dedicated service simplified the API and allowed me to focus on the main responsibility – orchestration and parsing of scan results.

- I extracted the scheduling module to make the codebase easier to manage and to avoid mixing business logic with infrastructure concerns.

- I used an in-memory approach to focus entirely on business logic – using something like PostgreSQL would also require moving scheduling into the database, which would significantly increase the project's complexity.

- "Fire and forget" communication is a major simplification, but it seems like a reasonable compromise compared to implementing exactly-once processing guarantees – which would be a significant overkill for this project.

- I intentionally skipped implementing GraphQL – the project has a very simple API, and adding GraphQL would neither meaningfully demonstrate my knowledge of it nor bring real value, but would only complicate the project.

- I omitted more advanced error handling at the task scheduler layer.

## Testing

I implemented API integration tests and unit tests to verify correctness and protect against regressions. The memory test demonstrates the correctness of the core functionality when parsing large results while managing available memory. The E2E test verifies the correctness of the entire flow at the API level.

I skipped frontend tests and full end-to-end tests of the entire project.

```bash
pnpm nx test api          # Unit & integration tests
pnpm nx test:stress api   # Memory stream test for json processing
pnpm nx test e2e          # E2E tests (requires Docker and docker-compose to be running)
```

## Trade-offs

The task could have been implemented with higher standards in terms of quality, reliability, and security; however, I approached it as a recruitment assignment rather than a production-grade service.
