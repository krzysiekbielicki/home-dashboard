Home Dashboard Frontend

Setup
- Create a Firebase project with Realtime Database.
- Copy your firebase config as JSON and set environment variable REACT_APP_FIREBASE_CONFIG to that JSON string.
- Generate VAPID keys (for push) and set REACT_APP_VAPID_PUBLIC_KEY in the environment to the public key (base64 urlsafe).

Development

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Build for production (deploy to GitHub Pages or static host):

```bash
npm run build
```
