# Deployment Instructions

## Vercel Deployment

This project uses a monorepo structure where the Next.js application is located in the `frontend` directory.

### Automatic Configuration (Supported via vercel.json)

The repository includes a `vercel.json` file that should automatically configure Vercel to build the frontend application.

### Manual Configuration (Recommended if Automatic Fails)

If you encounter issues or 404 errors, please configure the project settings in Vercel manually:

1. Go to your Vercel Project Dashboard.
2. Click on **Settings**.
3. In the **General** tab, find "Root Directory".
4. Click **Edit** and set it to:
   ```
   frontend
   ```
5. Click **Save**.
6. Redeploy the latest commit.
