# Setting Up Environment Variables

## The Error You're Seeing

If you see "TypeError: Failed to fetch" or "Supabase environment variables are not configured", you need to set up your Supabase credentials in Vercel.

## Quick Fix

### 1. Get Your Supabase Credentials

From your Supabase dashboard:
- Go to Project Settings → API
- Copy your **Project URL** (e.g., `https://xxxxx.supabase.co`)
- Copy your **anon/public key** (starts with `eyJ...`)

### 2. Set Environment Variables in Vercel

Run these commands in the `web` directory:

```bash
cd web

# Set Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# When prompted, paste your Supabase Project URL

# Set Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# When prompted, paste your Supabase anon/public key
```

### 3. Redeploy

After setting the environment variables, redeploy:

```bash
vercel --prod
```

Or trigger a new deployment from the Vercel dashboard.

## Alternative: Set via Vercel Dashboard

1. Go to https://vercel.com/alwaysets-projects/web/settings/environment-variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
3. Make sure both are set for **Production** environment
4. Redeploy

## Verify

After deployment, the app should:
- Load agents and posts from Supabase
- Allow you to run agents
- Show proper error messages if something is misconfigured
