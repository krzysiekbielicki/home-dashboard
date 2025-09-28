Home Dashboard (frontend + backend helper)

This workspace contains:

- frontend/: React + TypeScript app using MUI and Firebase Realtime Database. It registers a service worker to receive push notifications and allows subscribing (which stores subscription objects under /subscriptions).
- backend/go/iotmodule/: Go module that provides SetData(name, data any) and PushMessage(title, message string). It uses Firebase Admin SDK to write to the Realtime Database and webpush to send notifications.

Quick setup (high-level)

1. Firebase
   - Create a Firebase project and Realtime Database.
   - Create a service account JSON and set GOOGLE_APPLICATION_CREDENTIALS to its path for the Go backend.
   - Get the database URL and set FIREBASE_DATABASE_URL for Go; for frontend, set REACT_APP_FIREBASE_CONFIG as JSON string for the client SDK.

2. VAPID keys
   - Generate VAPID keys (e.g., using web-push libraries). Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY for the Go service, and REACT_APP_VAPID_PUBLIC_KEY for the frontend (public key, base64 urlsafe).

3. Frontend
   - cd frontend && npm install && npm run dev
   - Build with npm run build and host on GitHub Pages (simple static build output).

4. Go backend
   - cd backend/go/iotmodule
   - go mod tidy
   - run the example with required env vars set.

GitHub Pages CI/CD
------------------

This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the `frontend` and deploys the `frontend/dist` output to GitHub Pages. The workflow expects the following repository secrets to be set (Repository → Settings → Secrets → Actions):

- `VITE_FIREBASE_CONFIG` — the Firebase client config JSON string (same as you use locally). Put the whole JSON object as a single-line string.
- `VITE_VAPID_PUBLIC_KEY` — VAPID public key (base64 urlsafe) used by clients to subscribe.

Also make sure GitHub Pages is enabled for the repository (Pages settings) if necessary. The workflow uses the built-in `GITHUB_TOKEN` so no extra token is needed.

For local development, copy `frontend/.env.example` to `frontend/.env` and fill values.
