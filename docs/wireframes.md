# Initial Wireframes

These wireframes describe the main page layouts for the first version.

## Login Page

```text
+--------------------------------------------------+
|            Job Application Tracker               |
|                                                  |
|  Email                                           |
|  +--------------------------------------------+  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  Password                                        |
|  +--------------------------------------------+  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  [ Log In ]                                      |
|                                                  |
|  Don't have an account? Register                 |
+--------------------------------------------------+
```

## Dashboard

```text
+----------------+-----------------------------------------+
| Navigation     | Dashboard                               |
|                |                                         |
| Dashboard      | +----------+ +----------+ +----------+ |
| Applications   | | Total    | | Active   | | Interviews| |
| Resumes        | |   42     | |   17     | |     6     | |
| Settings       | +----------+ +----------+ +----------+ |
|                |                                         |
| Log Out        | +----------------+ +------------------+ |
|                | | Applications   | | Applications by  | |
|                | | over time      | | stage            | |
|                | +----------------+ +------------------+ |
|                |                                         |
|                | Recent Applications                     |
|                | --------------------------------------- |
|                | Company       Job Title       Stage     |
+----------------+-----------------------------------------+
```

## Applications Page

```text
+----------------+-----------------------------------------+
| Navigation     | Applications            [Add Application]|
|                |                                         |
| Dashboard      | Search: [____________________________]  |
| Applications   | Stage: [All v]   Sort: [Newest v]       |
| Resumes        |                                         |
| Settings       | --------------------------------------- |
|                | Company  Position  Stage  Applied  ...   |
|                | --------------------------------------- |
|                | Acme     Developer Applied July 10      |
|                | Globex   Engineer  Interview July 8     |
|                | Initech  Analyst   Rejected July 4      |
+----------------+-----------------------------------------+
```

## Add or Edit Application Page

```text
+----------------+-----------------------------------------+
| Navigation     | Add Application                         |
|                |                                         |
| Dashboard      | Company Name *                          |
| Applications   | [____________________________________]  |
| Resumes        |                                         |
| Settings       | Job Title *                             |
|                | [____________________________________]  |
|                |                                         |
|                | Stage *          Work Arrangement       |
|                | [Applied v]      [Remote v]             |
|                |                                         |
|                | Location                                |
|                | [____________________________________]  |
|                |                                         |
|                | Job URL                                 |
|                | [____________________________________]  |
|                |                                         |
|                | [Cancel]                 [Save]         |
+----------------+-----------------------------------------+
```

## Application Details Page

```text
+----------------+-----------------------------------------+
| Navigation     | Backend Developer at Acme               |
|                | [Edit] [Delete]                         |
| Dashboard      |                                         |
| Applications   | Stage: [Interview v]                    |
| Resumes        | Location: Remote                        |
| Settings       | Applied: July 10                        |
|                | Job URL: View posting                   |
|                |                                         |
|                | [Overview] [Notes] [Contacts] [History] |
|                | --------------------------------------- |
|                | Notes                                   |
|                |                                         |
|                | Recruiter call scheduled for Monday.    |
|                |                                         |
|                | [Add Note]                              |
+----------------+-----------------------------------------+
```

## Resumes Page

```text
+----------------+-----------------------------------------+
| Navigation     | Resume Versions          [Add Resume]   |
|                |                                         |
| Dashboard      | Frontend Resume                         |
| Applications   | React and TypeScript focused            |
| Resumes        | Used for 8 applications                 |
| Settings       | [View] [Edit] [Delete]                  |
|                | --------------------------------------- |
|                | Backend Resume                          |
|                | Node.js and PostgreSQL focused          |
|                | Used for 5 applications                 |
|                | [View] [Edit] [Delete]                  |
+----------------+-----------------------------------------+
```