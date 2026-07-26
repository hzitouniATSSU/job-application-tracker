# Product Requirements

## Product Name

Job Application Tracker

## Product Goal

The application will help individual job seekers organize applications,
track interview progress, save relevant information, and measure the results
of their job-search activity.

## Primary User

The primary user is an individual actively applying for multiple jobs.

The user may currently be managing applications through:

- Spreadsheets
- Email
- Browser bookmarks
- Personal notes
- Calendar reminders
- Multiple resume files

The application will bring this information together in one place.

## Core Problem

Job seekers often lose track of:

- Which jobs they applied to
- When they applied
- Which resume they submitted
- Who they contacted
- Upcoming interviews and deadlines
- Notes from conversations
- The current stage of each application
- How effective their job-search strategy is

## Main User Goals

A user should be able to:

1. Create a secure account.
2. Sign in and access private application data.
3. Add a new job application.
4. View all applications.
5. Update an existing application.
6. Delete an application.
7. Move an application between recruitment stages.
8. Add notes to an application.
9. Save recruiter and company contacts.
10. Record which resume version was used.
11. Search and filter applications.
12. Review job-search analytics.

## Minimum Viable Product

The first complete version will include:

### Authentication

- User registration
- User login
- User logout
- Protected application pages
- Secure password storage
- Private data for each user

### Job Applications

- Create an application
- View an application
- Edit an application
- Delete an application
- View a list of all applications

### Application Stages

- Wishlist
- Applied
- Screening
- Interview
- Technical Interview
- Final Interview
- Offer
- Rejected
- Withdrawn

### Notes

- Add notes
- Edit notes
- Delete notes
- Display when each note was created

### Contacts

- Add company or recruiter contacts
- Edit contacts
- Delete contacts

### Resume Versions

- Create a resume record
- Add a name and description
- Associate a resume with an application
- Store a link to the resume file

### Search and Filtering

- Search by company or job title
- Filter by application stage
- Filter by location
- Sort by application date
- Sort by last updated date

### Dashboard Analytics

- Total number of applications
- Active applications
- Interviews
- Offers
- Rejections
- Applications grouped by stage
- Applications submitted over time

## Features Outside the First Version

The following features will not be required for the initial release:

- Email synchronization
- Google Calendar integration
- Artificial intelligence features
- Automatic job scraping
- Browser extensions
- Native mobile applications
- Team accounts
- Recruiter accounts
- Automatic resume generation
- Automatic cover-letter generation

## Definition of Done

The first version will be considered complete when:

1. A user can register and sign in.
2. A user can manage their own applications.
3. A user cannot access another user's data.
4. Notes and contacts can be managed.
5. Resume versions can be associated with applications.
6. Search and filtering work.
7. Dashboard statistics are calculated correctly.
8. The application can run through Docker.
9. Important backend features have automated tests.
10. The application is deployed.
11. The GitHub repository contains clear setup instructions.

## Non-Functional Requirements

### Security

- Passwords must never be stored as plain text.
- Protected API endpoints must require authentication.
- Users must only access records that belong to them.
- Secret values must be stored in environment variables.

### Usability

- Forms must display clear validation errors.
- Loading and error states must be visible.
- Empty pages must explain what the user should do next.
- Important actions should be easy to find.

### Responsive Design

- The interface should work on desktop screens.
- The main features should remain usable on mobile screens.

### Reliability

- Invalid API requests must return consistent errors.
- Related database changes should use transactions when necessary.
- The application should not silently lose user input.

### Maintainability

- Frontend and backend code should be organized by responsibility.
- Repeated logic should be moved into reusable functions or components.
- Important technical decisions should be documented.

## Job Application Data

Each job application may contain the following information:

### Required Fields

- Company name
- Job title
- Current stage

### Optional Fields

- Location
- Work arrangement
- Employment type
- Job posting URL
- Job description
- Minimum salary
- Maximum salary
- Salary currency
- Application date
- Application deadline
- Source
- General notes

## Field Details

### Company Name

The organization offering the job.

Example:

```text
Spotify

## Application Stage Definitions

### Wishlist

The user is interested in the position but has not applied.

### Applied

The application has been submitted.

### Screening

The company has responded and an initial recruiter or human-resources
conversation is underway.

### Interview

The user has reached a general interview stage.

### Technical Interview

The user has reached a technical assessment, coding challenge, or technical
interview.

### Final Interview

The user has reached the final interview or decision stage.

### Offer

The company has made an offer.

### Rejected

The company rejected the application or closed the position.

### Withdrawn

The user chose to withdraw from the application process.


