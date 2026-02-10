# Backend Deployment Guide (cPanel + Vercel)

Since you are hosting the frontend on **Vercel** and have access to **cPanel**, you need to host your backend (Node.js/Express) on cPanel to keep it running 24/7.

Here are the step-by-step instructions.

## Step 1: Prepare the Background Server Files

1. Create a zip file containing **ONLY** the following files and folders:
   - `server/` (directory)
   - `package.json`
   - `.env` (make sure this has your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEEPSEEK_API_KEY`, etc.)

   *Note: Do NOT zip `node_modules` or `src` or `dist`.*

## Step 2: Deploy to cPanel

1. Log in to your cPanel.
2. **Setup Node.js App**: Look for "Setup Node.js App" or "Node.js" in the software section.
   - Click "Create Application".
   - **Node.js Version**: Select 20.x or the latest available.
   - **Application Mode**: Production.
   - **Application Root**: `api` (or any folder name you like, e.g., `coldspark-backend`).
   - **Application URL**: Select your domain. If you want it on a subdomain (like `api.yourdomain.com`), you need to create that subdomain in cPanel "Subdomains" first.
   - **Application Startup File**: `server/index.mjs`. (Important: Type this exactly).
   - Click **Create**.

3. **Upload Files**:
   - Usage the File Manager to go to the `Application Root` folder you just created (e.g., `coldspark-backend`).
   - Upload and extract your zip file there.

4. **Install Dependencies**:
   - Go back to the "Setup Node.js App" page.
   - You should see a button that says **Run NPM Install**. Click it. (This installs the packages from `package.json`).

5. **Start the Server**:
   - Click **Restart** or **Start App**.

6. **Test**:
   - Visit your backend URL (e.g., `https://api.yourdomain.com/api/scraper-active` or equivalent) to see if it responds (it might say unauthorized, but it should respond).

## Step 3: Configure Frontend (Vercel)

Now that your backend is live, you need to tell your Vercel frontend where to find it.

1. Go to your **Vercel Project Dashboard**.
2. Click **Settings** > **Environment Variables**.
3. Add `VITE_API_URL` with value `https://api.relaysolutions.net/api` (Make sure to include `/api` at the end).
   *Note: Do not include a trailing slash.*

4. **Redeploy**:
   - Go to **Deployments** and click "Redeploy" on the latest commit, or just push a new commit.

## Step 4: Verify

- Open your Vercel site.
- Open Developer Tools (F12) -> Network.
- Perform an action that uses the backend (e.g., sending an email, verifying SMTP).
- Verify the request goes to `https://api.relaysolutions.net/...` instead of the Vercel URL.

## Troubleshooting

- **CORS Errors**: If you see CORS errors in the browser console, you may need to update `server/index.mjs` to allow the Vercel domain explicitly in the `cors()` configuration if `cors()` default isn't enough (updates may be needed in `server/index.mjs`).
  - Current code: `app.use(cors());` (This allows all origins, which is fine for now but less secure).
