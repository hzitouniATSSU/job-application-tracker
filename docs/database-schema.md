# Database Schema

## Overview

The Job Application Tracker uses a relational database.

The database is designed around one main principle:

- A user owns many job applications.
- Each application may have many notes.
- Each application may have many contacts.
- Each application keeps a history of stage changes.
- A user owns multiple resume versions.
- Each application may reference one resume version.

---

# Tables

## Users

| Column | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| name | String | User's full name |
| email | String | Unique email address |
| password_hash | String | Hashed password |
| created_at | Timestamp | Account creation time |
| updated_at | Timestamp | Last update time |

## Applications

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key referencing `users.id` |
| resume_id | UUID | Optional foreign key referencing `resumes.id` |
| company_name | String | Name of the company |
| job_title | String | Position title |
| job_url | String | Link to the original job posting |
| location | String | Job location |
| work_arrangement | Enum | `REMOTE`, `HYBRID`, or `ON_SITE` |
| employment_type | Enum | `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, or `TEMPORARY` |
| current_stage | Enum | Current status of the application |
| salary_min | Decimal | Minimum estimated salary |
| salary_max | Decimal | Maximum estimated salary |
| salary_currency | String | Currency code such as `USD`, `EUR`, or `MAD` |
| job_description | Text | General information from the job posting |
| job_requirements | Text | Skills and qualifications required |
| benefits | Text | Benefits offered by the employer |
| applied_at | Timestamp | Date and time the application was submitted |
| created_at | Timestamp | Time the record was created |
| updated_at | Timestamp | Time the record was last updated |

## Notes

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key referencing `applications.id` |
| content | Text | Note content |
| created_at | Timestamp | Time the note was created |
| updated_at | Timestamp | Time the note was last updated |

## Contacts

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key referencing `applications.id` |
| name | String | Contact's full name |
| role | Enum | `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `HR`, or `OTHER` |
| email | String | Contact email address |
| phone | String | Contact phone number |
| linkedin_url | String | Link to the contact's LinkedIn profile |
| notes | Text | Notes specific to this contact |
| created_at | Timestamp | Time the contact was created |
| updated_at | Timestamp | Time the contact was last updated |

## Resumes

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key referencing `users.id` |
| name | String | Resume version name |
| description | Text | Description of the resume version |
| file_url | String | Location of the uploaded resume file |
| created_at | Timestamp | Time the resume was created |
| updated_at | Timestamp | Time the resume was last updated |

## Stage History

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| application_id | UUID | Foreign key referencing `applications.id` |
| previous_stage | Enum | Stage before the change |
| new_stage | Enum | Stage after the change |
| changed_at | Timestamp | Time the stage changed |



Users
│
├──────────────< Applications
│                   │
│                   ├──────────< Notes
│                   │
│                   ├──────────< Contacts
│                   │
│                   └──────────< Stage History
│
└──────────────< Resumes
                     ▲
                     │
             Applications.resume_id



             +---------+
|  Users  |
+---------+
     |
     | 1
     |
     | *
+----------------------+
|     Applications     |
+----------------------+
| PK  id               |
| FK  user_id          |
| FK  resume_id        |
| company_name         |
| job_title            |
| job_url              |
| location             |
| work_arrangement     |
| employment_type      |
| current_stage        |
| salary_min           |
| salary_max           |
| salary_currency      |
| job_description      |
| job_requirements     |
| benefits             |
| applied_at           |
| created_at           |
| updated_at           |
+----------------------+
     |
     +---------------------------+
     |            |              |
     |            |              |
     v            v              v

+----------------------+    +----------------------+    +----------------------+
|        Notes         |    |      Contacts        |    |    Stage History     |
+----------------------+    +----------------------+    +----------------------+
| PK  id               |    | PK  id               |    | PK  id               |
| FK  application_id   |    | FK  application_id   |    | FK  application_id   |
| content              |    | name                 |    | previous_stage       |
| created_at           |    | role                 |    | new_stage            |
| updated_at           |    | email                |    | changed_at           |
+----------------------+    | phone                |    +----------------------+
                            | linkedin_url         |
                            | notes                |
                            | created_at           |
                            | updated_at           |
                            +----------------------+

+---------+
|  Users  |
+---------+
     |
     | 1
     |
     | *
+----------------------+
|       Resumes        |
+----------------------+
| PK  id               |
| FK  user_id          |
| name                 |
| description          |
| file_url             |
| created_at           |
| updated_at           |
+----------------------+

Applications
     |
     | FK resume_id
     v
Resumes