
# Job Application Tracker

![CI](https://github.com/hzitouniATSSU/job-application-tracker/actions/workflows/ci.yml/badge.svg)

A full-stack job search management platform for organizing applications, tracking hiring stages, managing private documents, and scheduling follow-up reminders.

Built with React, TypeScript, Node.js, Express, PostgreSQL, and Prisma, with secure authentication, per-user data isolation, automated integration testing, structured logging, and production error monitoring.

## Live Demo
- **Frontend:** https://job-application-tracker-omega-jade.vercel.app
- **Backend API:** https://job-application-tracker-production-b5d6.up.railway.app
- **Source code:** https://github.com/hzitouniATSSU/job-application-tracker







## Screenshots

### Overview

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

### Application dashboard

![Application dashboard](docs/screenshots/application-form-1.png)
![Application Form](docs/screenshots/application-form-3.png) 

### Application details and stage history

![Application details](docs/screenshots/application-form-2.png)

### Follow-up reminders

![Reminders](docs/screenshots/reminders-panel.png)

### Documents

![Documents](docs/screenshots/documents-panel.png)

### Settings

![Settings](docs/screenshots/setting-panel.png)


## Features

### Authentication and accounts

- User registration and login
- Secure cookie-based sessions
- Email verification
- Resend verification emails
- Forgot-password and password-reset flow
- User-specific private application data
- Account settings

### Application management

- Create, view, edit, and delete applications
- Track application status
- Search by company, title, or location
- Filter applications by status
- Sort by date or company
- View application statistics
- Expand cards for additional details

### Stage history

- Record every application status change
- Display previous and new stages
- Preserve change timestamps
- Create an initial `Created → APPLIED` event
- Use database transactions to keep updates consistent

### Document library

- Upload PDF, DOC, and DOCX files
- Validate file type and size
- Attach documents to applications
- Detach or delete documents
- Open stored documents from the interface

### Reminders

- Create reminders for specific applications
- Support follow-ups, interviews, deadlines, and other events
- Display reminders chronologically
- Identify overdue reminders
- Mark reminders complete or reopen them
- Delete reminders

### API quality

- Organized routes, controllers, and middleware
- Request validation
- Consistent JSON errors
- Centralized error handling
- Prisma migrations
- Automated middleware tests

## Security

- Secure cookie-based authentication
- Password hashing with bcrypt
- Email verification
- Password reset using expiring, hashed reset tokens
- CSRF protection for authenticated mutations
- Rate limiting
- Security headers with Helmet
- Per-user authorization and data isolation
- Ownership validation for applications, documents, and reminders
- Restricted document file types and upload sizes
- Secure authentication cookie configuration
- Generic authentication responses to reduce account enumeration


## Technology stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Node.js
- Express
- Multer
- Prisma ORM
- Pino / pino-http
- Sentry

### Database

- PostgreSQL

### Testing

- Vitest
- Supertest
- Automated unit and integration tests
- PostgreSQL test database
- Multi-user authorization/isolation tests


## Architecture

```mermaid
flowchart TD
    UI["React + TypeScript"] --> API["Express REST API"]
    API --> Auth["Authentication & Security Middleware"]
    Auth --> Controllers["Controllers"]
    Controllers --> Prisma["Prisma ORM"]
    Prisma --> DB["PostgreSQL"]
    Controllers --> Storage["Private Document Storage"]
    API --> Logging["Pino Logging"]
    API --> Monitoring["Sentry Monitoring"]
```

## Project structure

```text
job-application-tracker/
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
│   ├── uploads/
│   └── index.js
├── docs/
│   └── screenshots/
└── README.md
```

## Getting started

### Prerequisites

Install:

- Node.js 24 or newer
- npm
- PostgreSQL 17 or newer

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

Update `server/.env` with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/job_tracker?schema=public"
PORT=3000
```

Create the PostgreSQL database:

```bash
createdb job_tracker
```

Apply the migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

### 3. Configure the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Testing

Run backend unit tests:

```bash
cd server
npx vitest run --mode test
```

Create a production frontend build:

```bash
cd client
npm run build
```

## API endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/auth/me` | Retrieve the authenticated user |
| `POST` | `/auth/logout` | Sign out |
| `POST` | `/auth/forgot-password` | Request a password reset |
| `POST` | `/auth/reset-password` | Reset a password |
| `POST` | `/auth/verify-email` | Verify an email address |
| `POST` | `/auth/resend-verification` | Resend verification email |

### Applications

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/jobs` | List applications |
| `POST` | `/jobs` | Create an application |
| `GET` | `/jobs/:id` | Retrieve one application |
| `PATCH` | `/jobs/:id` | Update an application |
| `DELETE` | `/jobs/:id` | Delete an application |

### Documents

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/documents` | List documents |
| `POST` | `/documents` | Upload a document |
| `DELETE` | `/documents/:id` | Delete a document |
| `POST` | `/documents/:documentId/jobs/:jobId` | Attach a document |
| `DELETE` | `/documents/:documentId/jobs/:jobId` | Detach a document |

### Reminders

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/reminders` | List reminders |
| `POST` | `/reminders` | Create a reminder |
| `PATCH` | `/reminders/:id` | Complete or reopen a reminder |
| `DELETE` | `/reminders/:id` | Delete a reminder |

## Engineering highlights

- Multi-user architecture with server-side ownership checks for private resources.
- Automated integration tests verify that one user cannot read, modify, or delete another user's data.
- Application status updates and stage-history records are committed atomically using Prisma transactions.
- Authentication uses secure cookies with CSRF protection for state-changing requests.
- Password reset and email verification tokens are cryptographically generated, hashed before storage, and expire automatically.
- Document uploads enforce ownership, file-type, and file-size restrictions.
- Centralized Express error handling provides consistent API responses.
- Pino provides structured application and HTTP logging.
- Sentry provides production exception monitoring.
- PostgreSQL schema changes are managed through Prisma migrations.


## Current limitations

- Email reminders are not currently sent automatically.
- Document storage depends on the configured server/cloud storage provider.
- The application does not currently integrate directly with external job boards.
- Advanced analytics and reporting are planned for future versions.

## Roadmap

- Cloud object storage for uploaded documents
- Email/calendar reminder integration
- Additional dashboard analytics
- Recruiter and interviewer contact tracking

## Deployment

The application is deployed using:

- **Frontend:** Vercel
- **Backend:** Railway
- **Database:** Railway PostgreSQL
- **File storage:** Railway persistent volume

### Environment variables

## Client:

```env
VITE_API_URL=https://job-application-tracker-production-b5d6.up.railway.app
```
## Server:

```env
DATABASE_URL=your_postgresql_connection_string
CLIENT_URL=https://job-application-tracker-omega-jade.vercel.app
```


## Author

**Haitam Zitouni**

Computer Science graduate building practical full-stack applications and pursuing technical support and software opportunities.







