
# Job Application Tracker

A full-stack web application for organizing job applications, tracking hiring stages, managing resume documents, and scheduling follow-up reminders.

Built as a practical portfolio project using React, TypeScript, Express, PostgreSQL, and Prisma.

## Live Demo
- **Frontend:** https://job-application-tracker-omega-jade.vercel.app
- **Backend API:** https://job-application-tracker-production-b5d6.up.railway.app
- **Source code:** https://github.com/hzitouniATSSU/job-application-tracker







## Screenshots

### Application dashboard

![Application dashboard](docs/screenshots/dashboard.png)

### Application details and stage history

![Application details](docs/screenshots/application-details.png)

### Follow-up reminders

![Reminders](docs/screenshots/reminders.png)

## Features

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

### Database

- PostgreSQL

### Testing

- Node.js built-in test runner
- `node:assert`

## Architecture

```mermaid
flowchart TD
    UI["React + TypeScript"] --> API["Express API"]
    API --> Controllers["Controllers"]
    Controllers --> Prisma["Prisma ORM"]
    Prisma --> Database["PostgreSQL"]
    API --> Uploads["Document storage"]
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
npm test
```

Create a production frontend build:

```bash
cd client
npm run build
```

## API endpoints

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

- Status updates and history records are written in one database transaction.
- Invalid input is rejected before reaching Prisma.
- Uploaded files are restricted by type and size.
- Application history and document relationships use relational database models.
- React state updates immediately after successful API operations.
- Unit tests verify validation and error-handling behavior.

## Current limitations

- The application currently operates as a single-user system.
- Uploaded files use local server storage during development.
- Authentication and authorization are not yet implemented.
- Production deployment requires persistent cloud file storage.

## Roadmap

- User authentication and authorization
- User-specific application data
- Recruiter and interviewer contacts
- Additional analytics and charts
- Cloud document storage
- Email or calendar reminder integration
- Expanded API integration tests

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







