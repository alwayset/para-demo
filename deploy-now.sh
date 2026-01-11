#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🚀 Deploying Supabase Edge Function"
echo "===================================="
echo ""

# Use npx for Supabase CLI
SUPABASE_CMD="npx --yes supabase"
PROJECT_REF="fsavpausztpryaouplqz"
SUPABASE_URL="https://fsavpausztpryaouplqz.supabase.co"

# Step 1: Try to login (will open browser)
echo "📋 Step 1: Authenticating with Supabase..."
echo "   (This will open your browser for authentication)"
echo ""

if ! $SUPABASE_CMD projects list &> /dev/null; then
    echo "Please authenticate in the browser that just opened..."
    $SUPABASE_CMD login
    echo ""
fi

# Step 2: Link project
echo "📋 Step 2: Linking project..."
$SUPABASE_CMD link --project-ref "$PROJECT_REF" --password "" 2>&1 || true
echo ""

# Step 3: Set required secrets
echo "📋 Step 3: Setting environment variables..."
echo "$SUPABASE_URL" | $SUPABASE_CMD secrets set SUPABASE_URL 2>&1 || true

echo ""
echo "⚠️  You need to provide the following secrets:"
echo ""
echo "1. Supabase Service Role Key"
echo "   Get it from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo ""
read -sp "   Enter Service Role Key: " SERVICE_KEY
echo ""
if [ -n "$SERVICE_KEY" ]; then
    echo "$SERVICE_KEY" | $SUPABASE_CMD secrets set SUPABASE_SERVICE_ROLE_KEY 2>&1 || true
    echo "   ✅ Set"
fi

echo ""
echo "2. Gemini API Key (optional for now, can be set later)"
read -sp "   Enter Gemini API Key (or press Enter to skip): " GEMINI_KEY
echo ""
if [ -n "$GEMINI_KEY" ]; then
    echo "$GEMINI_KEY" | $SUPABASE_CMD secrets set GEMINI_API_KEY 2>&1 || true
    echo "   ✅ Set"
fi

echo ""
echo "3. Tavily API Key (optional for now, can be set later)"
read -sp "   Enter Tavily API Key (or press Enter to skip): " TAVILY_KEY
echo ""
if [ -n "$TAVILY_KEY" ]; then
    echo "$TAVILY_KEY" | $SUPABASE_CMD secrets set TAVILY_API_KEY 2>&1 || true
    echo "   ✅ Set"
fi

# Step 4: Deploy
echo ""
echo "📋 Step 4: Deploying function..."
$SUPABASE_CMD functions deploy run-agent --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed!"
    echo ""
    echo "Function URL: $SUPABASE_URL/functions/v1/run-agent"
    echo ""
    echo "🎉 Your Next.js app should now work!"
else
    echo ""
    echo "❌ Deployment failed. Check the error above."
    exit 1
fi
