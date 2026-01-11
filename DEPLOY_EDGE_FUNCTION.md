# Deploy Supabase Edge Function

The "Failed to fetch" error is happening because the `run-agent` edge function is not deployed yet.

## Quick Deploy Steps

### 1. Login to Supabase CLI

```bash
cd /Users/erictao/GitHub/para-demo
npx supabase login
```

This will open your browser to authenticate.

### 2. Link Your Project

```bash
npx supabase link --project-ref fsavpausztpryaouplqz
```

(Your project ref is in your Supabase URL: `fsavpausztpryaouplqz`)

### 3. Set Environment Variables for the Function

The edge function needs these secrets:

```bash
# Get these from your Supabase dashboard → Settings → API
npx supabase secrets set SUPABASE_URL=https://fsavpausztpryaouplqz.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
npx supabase secrets set GEMINI_API_KEY=<your-gemini-key>
npx supabase secrets set TAVILY_API_KEY=<your-tavily-key>
```

**To find your Service Role Key:**
- Go to Supabase Dashboard → Settings → API
- Copy the "service_role" key (⚠️ Keep this secret!)

### 4. Deploy the Function

```bash
npx supabase functions deploy run-agent
```

### 5. Verify

After deployment, test the function:

```bash
curl -X POST https://fsavpausztpryaouplqz.supabase.co/functions/v1/run-agent \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<test-agent-id>","task":"test"}'
```

## Alternative: Deploy via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/fsavpausztpryaouplqz/functions
2. Click "Deploy a new function"
3. Upload the function code from `supabase/functions/run-agent/index.ts`
4. Set the environment variables in the dashboard

## After Deployment

Once deployed, the Next.js app should be able to call the function successfully!
