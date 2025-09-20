# Azure SQL Server Retention Planner

Estimate and visualize Azure SQL long-term backup (LTR) storage costs. Pretty much entirely vibed up by [Claude](https://claude.ai/)

Currently hosted at https://azsqlretention.term.nz

![site-view](readme-assets/site.png)

---

## Self Hosting

### Option 1: Docker Compose (Frontend + API)

```
docker compose up --build
```

Then visit: http://localhost:3000 (frontend) and http://localhost:8080 (API health: /health).

Stop with Ctrl+C. Add `-d` to run detached.

### Option 2: Run Containers Manually

Build frontend:

```
docker build -t azsql-retention-frontend .
docker run --rm -p 3000:80 azsql-retention-frontend
```

Build API:

```
docker build -t azsql-retention-api ./api
docker run --rm -p 8080:8080 azsql-retention-api
```

---

## Run Projects Individually

### Prerequisites

Install these first:

- Bun (dependency install & dev server) – https://bun.sh
- Rust toolchain (for the API) – https://rustup.rs
- Node.js (optional; some editors/tools expect it)
- Docker (optional; only needed if you use containers)

### Backend (Rust API)

```
cd api
cargo run
```

Listens on http://localhost:8080. Health check: `curl http://localhost:8080/health`

### Frontend (Vite + Bun)

Project root:

```
bun install
bun run dev
```

### Tests

```
bun test
```
