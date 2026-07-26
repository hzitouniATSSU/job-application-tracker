# User Flows

A user flow describes the sequence of actions a user takes to complete a goal.

## Flow 1: Register an Account

1. The visitor opens the registration page.
2. The visitor enters their name, email address, and password.
3. The visitor submits the form.
4. The frontend validates the form.
5. The backend checks whether the email is already registered.
6. The backend securely hashes the password.
7. The account is created.
8. The user is authenticated.
9. The user is redirected to the dashboard.

### Possible Errors

- A required field is empty.
- The email format is invalid.
- The email is already registered.
- The password does not meet the requirements.
- The server is unavailable.

## Flow 2: Log In

1. The user opens the login page.
2. The user enters their email address and password.
3. The user submits the form.
4. The backend verifies the credentials.
5. The backend returns an authentication token or session.
6. The user is redirected to the dashboard.

### Possible Errors

- The email is invalid.
- The password is incorrect.
- The account does not exist.
- The server is unavailable.

## Flow 3: Add a Job Application

1. The authenticated user opens the applications page.
2. The user selects "Add Application."
3. The application form opens.
4. The user enters the company name.
5. The user enters the job title.
6. The user selects the current stage.
7. The user optionally enters additional information.
8. The user submits the form.
9. The frontend validates the input.
10. The backend saves the application.
11. The user is redirected to the application details page.
12. A success message is displayed.

### Possible Errors

- A required field is missing.
- A URL is invalid.
- A salary value is invalid.
- The authentication session has expired.
- The server cannot save the application.

## Flow 4: Update an Application Stage

1. The user opens an application.
2. The user selects a new stage.
3. The frontend sends the stage update to the backend.
4. The backend verifies that the application belongs to the user.
5. The backend records the previous stage.
6. The backend updates the current stage.
7. The backend creates a stage-history record.
8. The updated stage appears in the interface.

## Flow 5: Add a Note

1. The user opens an application.
2. The user navigates to the notes section.
3. The user enters a note.
4. The user submits the note.
5. The backend verifies application ownership.
6. The note is saved.
7. The note appears with its creation date.

## Flow 6: Add a Contact

1. The user opens an application.
2. The user navigates to the contacts section.
3. The user selects "Add Contact."
4. The user enters contact information.
5. The user submits the form.
6. The backend verifies application ownership.
7. The contact is saved.
8. The contact appears on the application page.

## Flow 7: Search and Filter Applications

1. The user opens the applications page.
2. The user enters a search term or selects a filter.
3. The application list updates.
4. The URL stores the active search and filter values.
5. The user can open any matching application.

## Flow 8: Log Out

1. The user selects "Log Out."
2. The authentication information is removed.
3. Private application data is cleared from the frontend.
4. The user is redirected to the login page.