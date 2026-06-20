# TRACEXDATA Deployment Guide

If you are seeing "Server returned HTML instead of JSON", it means your **Backend Proxy** is not running. 

## 1. Why it fails on Firebase Hosting
Firebase Hosting only serves **static** files (index.html). It cannot run the `server.ts` file which is required to protect your API keys.

## 2. The 100% Sure Fix (Full-Stack Deployment)
To keep your API keys safe, you must deploy the project to a service that supports **Node.js**:

### Option A: Firebase Cloud Functions (Recommended for Firebase users)
You need to wrap the Express app in a Cloud Function.
1. Install `firebase-functions` and `firebase-admin`.
2. Move `server.ts` logic into a function.
3. Update `firebase.json` rewrites to point `/api/**` to your function.

### Option B: Cloud Run (Easiest for full apps)
1. Deploy this entire repository to **Google Cloud Run**.
2. It will automatically detect `npm start` and run the Express server.
3. Your proxy will work perfectly and keys will be hidden.

### Option C: Vercel / Railway / Render
These services automatically detect the `server.ts` or `package.json` and host the full-stack app.

---

## Technical Check
- Ensure `LOOKUP_API_KEY` and `VITE_SUPABASE_URL` are set in the environment variables of your hosting provider.
- Run `npm run build` before deploying to ensure the `dist/` folder is ready.
