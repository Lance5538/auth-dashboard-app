# Login Register Project

This repository now uses a React frontend as the main implementation of the authentication flow and dashboard preview.

## Project Structure

- `frontend/`: main frontend app built with React, TypeScript, and Vite
- `images/`: local backup assets not used as the main source of truth

## Current Frontend Flow

- `login` -> `dashboard`
- `register` -> `dashboard`

The current flow is still frontend-only. It previews the interface and navigation, but it does not yet connect to a real backend or database.

## What Works Right Now

- Login screen UI
- Register screen UI
- Dashboard preview UI
- Local development with Vite
- Production build output for local preview

## Backend Work Still Needed

- Real register API
- Real login API
- User data storage
- Password hashing and validation
- Dashboard data APIs

## Run The Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open the local address shown in the terminal.

## Notes

- `frontend/` is the only folder that should continue to be developed as the main app.
- The old static HTML version has been removed from the active project structure to avoid maintenance conflicts.
