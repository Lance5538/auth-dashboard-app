# Login Register Page

This project is a beginner-friendly frontend prototype for a simple authentication flow. It currently focuses on page structure, navigation, and styling rather than real backend logic.

## Current Features

- A `Register` page with username and password inputs
- A `Login` page with username and password inputs
- A `Home` page shown after login
- Basic page-to-page navigation
- Shared styling across all pages
- Different background images for different pages

## Current Flow

- `register.html` -> `login.html`
- `login.html` -> `home.html`

At the moment, this flow is only a frontend prototype. The pages can navigate to each other, but there is no real user account system behind them yet.

## What Works Right Now

- The basic UI structure is in place
- The project can be opened and previewed locally in a browser
- Users can move through the intended page flow
- The layout is simple and easy to understand for further development

## Current Limitations

- No backend support yet
- No database for storing users
- No real registration logic
- No real login validation
- Passwords are not securely handled
- Form validation is still very basic
- Error messages and user feedback are limited
- The project structure is still in an early learning-stage form

## Future Improvements

- Add a backend service for registration and login
- Add a database to store user accounts
- Make `username` unique and validate it on registration
- Hash passwords instead of storing them as plain text
- Add proper login verification for matching account and password
- Improve form validation and custom English error messages
- Add success and error feedback for user actions
- Improve responsive design for more screen sizes
- Clean up project structure as the app grows
- Deploy the project so it can be accessed online

## Suggested Next Steps

1. Keep the current frontend as a prototype
2. Connect the pages to a backend such as Node.js + Express
3. Add a database such as SQLite or MySQL
4. Implement real register and login APIs
5. Improve security and validation

## Notes

This project is mainly for learning and early collaboration. It is useful as a frontend starting point, but it is not production-ready yet.
