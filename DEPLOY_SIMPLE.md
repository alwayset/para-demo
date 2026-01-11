# Simple Deployment Steps

Since the tokens page isn't accessible, we'll use the interactive CLI method. It's actually easier!

## Step 1: Login to Supabase CLI

Run this command in your terminal:

```bash
cd /Users/erictao/GitHub/para-demo
npx supabase login
```

This will:
- Open your browser automatically
- Ask you to sign in to Supabase
- Authenticate the CLI

## Step 2: Link Your Project

After login, link your project:

```bash
npx supabase link --project-ref fsavpausztpryaouplqz
```

It will ask for your database password - you can leave it blank or press Enter if you don't have one set.

## Step 3: Set Secrets

You'll need to get these from your Supabase dashboard:

**Get Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/fsavpausztpryaouplqz/settings/api
2. Copy the "service_role" key (the secret one, not the anon key)
3. Run:

```bash
echo "YOUR_SERVICE_ROLE_KEY_HERE" | npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY
```

**Set the Supabase URL:**
```bash
echo "https://fsavpausztpryaouplqz.supabase.co" | npx supabase secrets set SUPABASE_URL
```

**Set Gemini API Key** (if you have one):
```bash
echo "YOUR_GEMINI_KEY_HERE" | npx supabase secrets set GEMINI_API_KEY
```

**Set Tavily API Key** (if you have one):
```bash
echo "YOUR_TAVILY_KEY_HERE" | npx supabase secrets set TAVILY_API_KEY
```

## Step 4: Deploy!

```bash
npx supabase functions deploy run-agent
```

That's it! 🎉
