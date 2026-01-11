#!/bin/bash
set -e

echo "🚀 Deploying Supabase Edge Function: run-agent"
echo ""

cd "$(dirname "$0")"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null && ! npx --yes supabase --version &> /dev/null 2>&1; then
    echo "Using npx to run Supabase CLI..."
    SUPABASE_CMD="npx --yes supabase"
else
    SUPABASE_CMD="supabase"
fi

# Step 1: Check authentication
echo "📋 Step 1: Checking authentication..."
if ! $SUPABASE_CMD projects list &> /dev/null; then
    echo "❌ Not authenticated. Please run:"
    echo "   $SUPABASE_CMD login"
    echo ""
    echo "This will open your browser to authenticate."
    echo "After authentication, run this script again."
    exit 1
fi
echo "✅ Authenticated"

# Step 2: Link project
echo ""
echo "📋 Step 2: Linking project..."
PROJECT_REF="fsavpausztpryaouplqz"
if [ ! -f .supabase/project-ref ]; then
    echo "Linking project: $PROJECT_REF"
    $SUPABASE_CMD link --project-ref "$PROJECT_REF" --password ""
    echo "✅ Project linked"
else
    CURRENT_REF=$(cat .supabase/project-ref 2>/dev/null || echo "")
    if [ "$CURRENT_REF" != "$PROJECT_REF" ]; then
        echo "Re-linking project: $PROJECT_REF"
        $SUPABASE_CMD link --project-ref "$PROJECT_REF" --password ""
    fi
    echo "✅ Project already linked"
fi

# Step 3: Set secrets (will prompt if not provided)
echo ""
echo "📋 Step 3: Setting environment variables..."
SUPABASE_URL="https://fsavpausztpryaouplqz.supabase.co"

# Check if secrets are already set
echo "Setting SUPABASE_URL..."
echo "$SUPABASE_URL" | $SUPABASE_CMD secrets set SUPABASE_URL

# Prompt for other secrets if not in environment
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo ""
    echo "⚠️  You need to provide your Supabase Service Role Key."
    echo "   Get it from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
    read -sp "Enter Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
    echo ""
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "$SUPABASE_SERVICE_ROLE_KEY" | $SUPABASE_CMD secrets set SUPABASE_SERVICE_ROLE_KEY
    echo "✅ Service Role Key set"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo ""
    read -sp "Enter Gemini API Key (or press Enter to skip): " GEMINI_API_KEY
    echo ""
fi

if [ -n "$GEMINI_API_KEY" ]; then
    echo "$GEMINI_API_KEY" | $SUPABASE_CMD secrets set GEMINI_API_KEY
    echo "✅ Gemini API Key set"
fi

if [ -z "$TAVILY_API_KEY" ]; then
    echo ""
    read -sp "Enter Tavily API Key (or press Enter to skip): " TAVILY_API_KEY
    echo ""
fi

if [ -n "$TAVILY_API_KEY" ]; then
    echo "$TAVILY_API_KEY" | $SUPABASE_CMD secrets set TAVILY_API_KEY
    echo "✅ Tavily API Key set"
fi

# Step 4: Deploy function
echo ""
echo "📋 Step 4: Deploying edge function..."
$SUPABASE_CMD functions deploy run-agent --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed run-agent function!"
    echo ""
    echo "Test it at: $SUPABASE_URL/functions/v1/run-agent"
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi
