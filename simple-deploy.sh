#!/bin/bash
set -e

echo "🚀 Simple Supabase Edge Function Deployment"
echo "============================================"
echo ""

cd "$(dirname "$0")"

echo "📋 Step 1: Login to Supabase"
echo "   This will open your browser..."
echo ""
npx --yes supabase login

echo ""
echo "📋 Step 2: Link your project..."
npx --yes supabase link --project-ref fsavpausztpryaouplqz --password ""

echo ""
echo "📋 Step 3: Setting Supabase URL..."
echo "https://fsavpausztpryaouplqz.supabase.co" | npx --yes supabase secrets set SUPABASE_URL

echo ""
echo "📋 Step 4: You need to set your Service Role Key"
echo "   Get it from: https://supabase.com/dashboard/project/fsavpausztpryaouplqz/settings/api"
echo "   (Look for 'service_role' key - the secret one)"
echo ""
read -sp "Paste your Service Role Key and press Enter: " SERVICE_KEY
echo ""
if [ -n "$SERVICE_KEY" ]; then
    echo "$SERVICE_KEY" | npx --yes supabase secrets set SUPABASE_SERVICE_ROLE_KEY
    echo "✅ Service Role Key set"
fi

echo ""
read -sp "Gemini API Key (or press Enter to skip): " GEMINI_KEY
echo ""
if [ -n "$GEMINI_KEY" ]; then
    echo "$GEMINI_KEY" | npx --yes supabase secrets set GEMINI_API_KEY
    echo "✅ Gemini API Key set"
fi

echo ""
read -sp "Tavily API Key (or press Enter to skip): " TAVILY_KEY
echo ""
if [ -n "$TAVILY_KEY" ]; then
    echo "$TAVILY_KEY" | npx --yes supabase secrets set TAVILY_API_KEY
    echo "✅ Tavily API Key set"
fi

echo ""
echo "📋 Step 5: Deploying function..."
npx --yes supabase functions deploy run-agent --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo "Function URL: https://fsavpausztpryaouplqz.supabase.co/functions/v1/run-agent"
