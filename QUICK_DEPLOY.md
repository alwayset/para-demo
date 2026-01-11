# Quick Deploy Guide

I've created automated scripts to deploy the edge function. Choose one method:

## Method 1: Using Supabase CLI (Recommended)

**First, authenticate:**
```bash
cd /Users/erictao/GitHub/para-demo
npx supabase login
```
This will open your browser. After authentication, run:

```bash
./deploy-edge-function.sh
```

This script will:
- ✅ Check authentication
- ✅ Link your project
- ✅ Prompt for secrets (Service Role Key, API keys)
- ✅ Deploy the function

## Method 2: Using Management API (No Browser Required)

**Get your access token:**
1. Go to https://supabase.com/account/tokens
2. Click "Generate new token"
3. Copy the token

**Deploy:**
```bash
cd /Users/erictao/GitHub/para-demo
export SUPABASE_ACCESS_TOKEN=your_token_here
./deploy-via-api.sh
```

**Note:** You'll still need to set the function secrets (Service Role Key, Gemini API Key, Tavily API Key) separately via:
```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
npx supabase secrets set GEMINI_API_KEY=<key>
npx supabase secrets set TAVILY_API_KEY=<key>
```

## Method 3: Manual Deployment via Dashboard

1. Go to https://supabase.com/dashboard/project/fsavpausztpryaouplqz/functions
2. Click "Deploy a new function"
3. Name it: `run-agent`
4. Upload the code from `supabase/functions/run-agent/index.ts`
5. Set environment variables in the dashboard:
   - `SUPABASE_URL` = `https://fsavpausztpryaouplqz.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Settings → API)
   - `GEMINI_API_KEY` = (your Gemini key)
   - `TAVILY_API_KEY` = (your Tavily key)

## What You Need

- **Supabase Service Role Key**: Get from https://supabase.com/dashboard/project/fsavpausztpryaouplqz/settings/api
- **Gemini API Key**: Get from https://aistudio.google.com/apikey
- **Tavily API Key**: Get from https://tavily.com

After deployment, your Next.js app should work! 🎉
