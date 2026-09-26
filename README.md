# Job Application Tracker

A production-deployed full-stack job search management platform for organizing applications, tracking hiring stages, managing private documents, and scheduling follow-up reminders.

Built with React, TypeScript, Node.js, Express, PostgreSQL, Prisma, and Docker. The project includes secure authentication, per-user data isolation, automated testing, structured logging, production monitoring, persistent storage, database migrations, automated backups, health checks, and a self-hosted deployment pipeline.

## Live Demo

- **Application:** https://job-application-tracker-omega-jade.vercel.app
- **Source code:** https://github.com/hzitouniATSSU/job-application-tracker

The React frontend is deployed on Vercel. The backend API, PostgreSQL database, and private file storage run on a self-hosted Debian server using Docker Compose and are exposed securely over HTTPS through Tailscale Funnel.

---

## Screenshots

### Overview

### Application dashboard

### Application details and stage history

### Follow-up reminders

### Documents

### Settings

---

## Features

### Authentication and accounts

- User registration and login
- Secure cookie-based authentication
- Email verification
- Resend verification emails
- Forgot-password and password-reset flow
- User-specific private application data
- Account settings and profile management
- Account deletion
- Profile photo storage
- CSRF protection for state-changing requests

### Application management

- Create, view, edit, and delete job applications
- Track application status
- Search by company, title, or location
- Filter applications by status
- Sort applications by date or company
- View application statistics
- Expand cards for additional details

### Stage history

- Record application status changes
- Display previous and new stages
- Preserve change timestamps
- Create an initial `Created → APPLIED` event
- Use database transactions to keep application updates and history consistent

### Document library

- Upload PDF, DOC, and DOCX files
- Validate file type and size
- Store uploaded files privately
- Attach documents to applications
- Detach documents from applications
- Delete documents
- Open stored documents through authenticated application routes
- Persist files independently of API container recreation

### Reminders

- Create reminders for specific applications
- Support follow-ups, interviews, deadlines, and other events
- Display reminders chronologically
- Identify overdue reminders
- Mark reminders complete or reopen them
- Delete reminders

---

## Security

The application includes multiple layers of application and infrastructure security:

- Password hashing with bcrypt
- Secure HTTP-only authentication cookies
- `Secure` and production-aware cookie configuration
- CSRF protection for authenticated mutations
- Email verification
- Password-reset tokens that expire and are hashed before storage
- Rate limiting for authentication and API endpoints
- Security headers with Helmet
- Per-user authorization and data isolation
- Ownership validation for applications, documents, and reminders
- Restricted document file types and upload sizes
- Generic authentication responses to reduce account enumeration
- Backend bound only to `127.0.0.1` on the host
- Public HTTPS access provided through Tailscale Funnel
- Production secrets kept outside Git through ignored environment files
- Docker build context protected from local secrets

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Vercel

### Backend

- Node.js 24
- Express
- Multer
- Prisma ORM
- Pino / pino-http
- Sentry

### Database

- PostgreSQL 17
- Prisma migrations
- Persistent Docker volume

### Infrastructure

- Debian Linux homelab server
- Docker
- Docker Compose
- Tailscale Funnel
- Vercel
- systemd
- Git / GitHub
- Persistent Docker volumes

### Testing & CI

- Vitest
- Supertest
- Backend unit tests
- Backend integration tests
- PostgreSQL test database
- Multi-user authorization and isolation tests
- GitHub Actions
- Automated backend testing
- Automated frontend production builds

---

## Production Architecture

```text
                         Internet
                            │
                            ▼
                   ┌─────────────────┐
                   │     Vercel      │
                   │ React + Vite UI │
                   └────────┬────────┘
                            │
                     /api requests
                            │
                            ▼
                   ┌─────────────────┐
                   │ Tailscale Funnel│
                   │      HTTPS      │
                   └────────┬────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    Debian Homelab Server │
              │                           │
              │  ┌─────────────────────┐  │
              │  │ Docker Compose      │  │
              │  │                     │  │
              │  │  Express API        │  │
              │  │  127.0.0.1:3000    │  │
              │  │        │            │  │
              │  │        ▼            │  │
              │  │  PostgreSQL 17      │  │
              │  └─────────────────────┘  │
              │                           │
              │  Persistent volumes:     │
              │  • PostgreSQL data       │
              │  • Private documents     │
              └───────────────────────────┘
```

The frontend and backend are deployed independently.

Vercel serves the React application and proxies API requests to the backend. The Express API runs inside Docker on the homelab and is not directly exposed through a router port-forward. Tailscale Funnel provides the public HTTPS entry point.

PostgreSQL and uploaded files use Docker named volumes so API container rebuilds and recreations do not remove application data.

---

## Backend Architecture

```mermaid
flowchart TD
    UI[React + TypeScript] --> API[Express REST API]
    API --> AUTH[Authentication / CSRF / Security Middleware]
    AUTH --> CONTROLLERS[Controllers]
    CONTROLLERS --> PRISMA[Prisma ORM]
    PRISMA --> DB[(PostgreSQL)]
    CONTROLLERS --> STORAGE[Private Document Storage]
    API --> LOGGING[Pino Structured Logging]
    API --> MONITORING[Sentry Error Monitoring]
    API --> HEALTH[Health Endpoint]
```

---

## Production Reliability

### Docker health checks

Both the API and PostgreSQL services have health checks.

The API exposes:

```text
GET /health
```

Example response:

```json
{
  "status": "ok",
  "uptime": 120.42,
  "timestamp": "2026-09-25T11:28:48.778Z"
}
```

Docker periodically checks this endpoint and reports the API container as `healthy` only when it responds successfully.

PostgreSQL health is checked with `pg_isready`.

### Restart policy

Production containers use:

```yaml
restart: unless-stopped
```

This allows the application to recover automatically after host reboots or unexpected container exits.

---

## Database Migrations

Database schema changes are managed using Prisma migrations.

Production deployments use:

```bash
npx prisma migrate deploy
```

The production database is baselined against the complete migration history, allowing subsequent migrations to be applied incrementally and safely.

Development environments can use:

```bash
npx prisma migrate dev
```

---

## Backups and Restore Testing

The production environment automatically backs up both application data layers:

1. PostgreSQL database
2. Private uploaded-file storage

Database backups use PostgreSQL's custom dump format.

Private documents are archived separately from the persistent Docker storage volume.

Backups are executed automatically through a systemd timer.

### Backup validation

The backup system has been restore-tested rather than only checking that backup files exist.

A database backup was restored into an isolated test database and row counts were compared with production.

The restored database contained the same users, applications, documents, reminders, and stage-history records.

Private document storage was also extracted separately and validated using SHA-256 checksums against the live Docker volume.

This verifies that both the relational database and uploaded files can be recovered from backup.

---

## Monitoring and Logging

### Structured logging

Pino and pino-http provide structured application and HTTP request logs.

Production logs include information such as request method, request path, response status, response time, environment, server startup events, and unexpected exceptions and promise rejections.

Sensitive cookie values are redacted from request logs.

### Sentry

Sentry provides production exception monitoring.

Sentry instrumentation is initialized before the application modules load so Express requests and errors can be instrumented correctly.

### Docker

Runtime state can also be inspected using:

```bash
docker compose ps
docker compose logs api
```

---

## Continuous Integration

GitHub Actions runs automatically on pushes and pull requests.

The CI pipeline:

- Installs backend dependencies
- Installs frontend dependencies
- Provisions PostgreSQL for integration testing
- Applies the test database schema
- Generates the Prisma client
- Runs backend unit and integration tests
- Tests multi-user authorization boundaries
- Builds the React frontend for production

CI and production deployment are intentionally separate: GitHub Actions verifies the code, while production deployment is performed through the homelab deployment workflow.

---

## Deployment Workflow

Production source code is maintained as a Git checkout on the Debian server.

```text
Development machine
       │
       │ git push
       ▼
     GitHub
       │
       │ guarded git pull
       ▼
Production homelab
       │
       ├── pre-deployment backup
       ├── verify clean Git working tree
       ├── fast-forward source update
       ├── build Docker image
       ├── verify PostgreSQL health
       ├── apply Prisma migrations
       ├── recreate/start API
       └── verify API health
```

### Deploying

After changes have been tested and pushed:

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

Production deployment is then triggered on the homelab with:

```bash
~/homelab/scripts/deploy-job-tracker.sh
```

The deployment script performs eight stages:

```text
[1/8] Creating pre-deployment backup
[2/8] Checking production working tree
[3/8] Updating source from GitHub
[4/8] Building API image
[5/8] Ensuring database is healthy
[6/8] Applying Prisma migrations
[7/8] Starting/recreating API
[8/8] Waiting for API health
```

The Git update uses fast-forward-only behavior. Deployment stops rather than automatically merging if production has diverged from the repository.

The deployment also fails if the production working tree contains local source modifications.

A deployment is reported as successful only after the API Docker health check passes.

---

## Docker Deployment

The repository includes:

```text
docker-compose.yml
server/Dockerfile
```

The production Compose stack contains two primary services.

### `db`

- PostgreSQL 17
- Persistent database volume
- `pg_isready` health check
- `unless-stopped` restart policy

### `api`

- Node.js 24
- Express API
- Prisma Client
- Private persistent storage volume
- HTTP `/health` Docker health check
- `unless-stopped` restart policy
- Host binding restricted to `127.0.0.1:3000`

The API waits for PostgreSQL to become healthy before startup.

---

## Project Structure

```text
job-application-tracker/
├── .github/
│   └── workflows/
│       └── ci.yml
├── client/
│   └── src/
│       ├── components/
│       ├── types/
│       ├── App.tsx
│       └── App.css
├── server/
│   ├── controllers/
│   ├── lib/
│   ├── middleware/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── routes/
│   ├── tests/
│   ├── Dockerfile
│   ├── instrument.js
│   └── index.js
├── docs/
│   └── screenshots/
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites

Install:

- Node.js 24 or newer
- npm
- PostgreSQL 17 or newer
- Git

Docker and Docker Compose are recommended for running an environment similar to production.

### 1. Clone the repository

```bash
git clone https://github.com/hzitouniATSSU/job-application-tracker.git
cd job-application-tracker
```

### 2. Configure the backend

```bash
cd server
npm install
cp .env.example .env
```

Configure the required environment variables.

A local PostgreSQL connection looks similar to:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/job_tracker?schema=public"
PORT=3000
NODE_ENV=development
```

Additional authentication, email, and monitoring variables are required for the corresponding features.

### 3. Create and migrate the database

```bash
createdb job_tracker
npx prisma migrate dev
npx prisma generate
```

### 4. Start the backend

```bash
npm run dev
```

The API runs locally on port `3000` by default.

### 5. Configure the frontend

In another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite development URL shown in the terminal.

---

## Running with Docker

Create the required root `.env` file for Docker Compose and then run:

```bash
docker compose up -d --build
```

Check service health:

```bash
docker compose ps
```

View API logs:

```bash
docker compose logs -f api
```

Stop the stack:

```bash
docker compose down
```

Named volumes preserve PostgreSQL and uploaded-document data when containers are stopped or recreated.

---

## Testing

Run backend tests:

```bash
cd server
npx vitest run --mode test
```

Build the frontend:

```bash
cd client
npm run build
```

---

## API Endpoints

### Health

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health and uptime |

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/auth/me` | Retrieve the authenticated user |
| `POST` | `/auth/logout` | Sign out |
| `POST` | `/auth/forgot-password` | Request a password reset |
| `POST` | `/auth/reset-password` | Reset a password |
| `POST` | `/auth/verify-email` | Verify an email address |
| `POST` | `/auth/resend-verification` | Resend a verification email |
| `DELETE` | `/auth/account` | Delete the authenticated account |

### Applications

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/jobs` | List applications |
| `POST` | `/jobs` | Create an application |
| `GET` | `/jobs/:id` | Retrieve an application |
| `PATCH` | `/jobs/:id` | Update an application |
| `DELETE` | `/jobs/:id` | Delete an application |

### Documents

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/documents` | List documents |
| `POST` | `/documents` | Upload a document |
| `DELETE` | `/documents/:id` | Delete a document |
| `POST` | `/documents/:documentId/jobs/:jobId` | Attach a document |
| `DELETE` | `/documents/:documentId/jobs/:jobId` | Detach a document |

### Reminders

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/reminders` | List reminders |
| `POST` | `/reminders` | Create a reminder |
| `PATCH` | `/reminders/:id` | Complete or reopen a reminder |
| `DELETE` | `/reminders/:id` | Delete a reminder |

---

## Engineering Highlights

- Full-stack TypeScript/JavaScript application deployed to a real production environment
- Self-hosted backend and database on Debian Linux
- Dockerized Node.js API and PostgreSQL services
- Persistent PostgreSQL and private document-storage volumes
- Multi-user architecture with server-side ownership checks
- Automated tests verify that users cannot access another user's private resources
- Application status updates and stage-history records use Prisma transactions
- Secure cookie authentication with CSRF protection
- Email verification and password recovery flows
- Cryptographically generated, hashed, expiring authentication tokens
- Private document storage with ownership, type, and size validation
- Structured production logging with Pino
- Production exception monitoring with Sentry
- Docker API and database health checks
- Automated systemd backups
- Database restore testing
- File-backup integrity verification with SHA-256
- Prisma migration-based schema management
- GitHub Actions continuous integration
- Git-based production deployments
- Pre-deployment backups
- Guarded fast-forward-only production updates
- Automated migration execution during deployment
- Post-deployment health verification
- Public HTTPS backend access without router port forwarding

---

## Current Limitations

- Email reminders are not automatically sent
- Uploaded documents currently use self-hosted persistent storage rather than external object storage
- The application does not integrate directly with external job boards
- Advanced analytics and reporting remain limited
- Production currently runs on a single self-hosted node rather than a highly available cluster

---

## Roadmap

- Email and calendar reminder integration
- Additional dashboard analytics
- Recruiter and interviewer contact tracking
- Optional object-storage integration
- Additional observability and operational metrics

---

## Production Environment

| Component | Deployment |
| --- | --- |
| Frontend | Vercel |
| Backend | Docker on Debian homelab |
| Database | PostgreSQL 17 in Docker |
| File storage | Persistent Docker volume |
| Public backend ingress | Tailscale Funnel |
| Monitoring | Sentry + Pino logs |
| Database migrations | Prisma |
| Backups | Automated systemd backup job |
| Source deployment | GitHub → homelab |
| Container orchestration | Docker Compose |

Production secrets are stored in ignored environment files and are not committed to the repository.

---

## Author

**Haitam Zitouni**

Computer Science graduate building practical full-stack systems with an emphasis on backend development, deployment, reliability, and client-facing technical problem solving.
