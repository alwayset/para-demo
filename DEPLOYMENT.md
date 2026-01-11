# Deployment Guide

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the following:
   - Database schema applied (from `db/schema.sql`)
   - Storage bucket created (default: `para-bucket`)
   - Project Reference ID

2. **Environment Variables**:
   - Supabase URL
   - Supabase Service Role Key
   - Gemini API Key
   - Tavily API Key

## Deploy Supabase Edge Function

1. **Login to Supabase CLI**:
   ```bash
   npx supabase login
   ```
   This will open your browser to authenticate.

2. **Link your project**:
   ```bash
   cd /Users/erictao/GitHub/para-demo
   npx supabase link --project-ref <your-project-ref>
   ```

3. **Set environment variables for the function**:
   ```bash
   npx supabase secrets set SUPABASE_URL=<your-supabase-url>
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   npx supabase secrets set GEMINI_API_KEY=<your-gemini-key>
   npx supabase secrets set TAVILY_API_KEY=<your-tavily-key>
   ```

4. **Deploy the function**:
   ```bash
   npx supabase functions deploy run-agent
   ```

## Deploy Next.js App to Vercel

1. **Set environment variables in Vercel**:
   ```bash
   cd web
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

## Quick Deploy Script

Run the deployment script:
```bash
./deploy-supabase.sh
```

Or deploy both:
```bash
# Deploy Supabase function
cd /Users/erictao/GitHub/para-demo
npx supabase functions deploy run-agent

# Deploy Next.js app
cd web
vercel --prod
```
