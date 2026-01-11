#!/bin/bash
set -e

cd "$(dirname "$0")"

SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYXZwYXVzenRwcnlhb3VwbHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA1NDQ2MSwiZXhwIjoyMDgzNjMwNDYxfQ.v2l-PZyQwLxsyxJDETK_CYjtb81dO4esL6Wf8-DFOxs"
SUPABASE_URL="https://fsavpausztpryaouplqz.supabase.co"
PROJECT_REF="fsavpausztpryaouplqz"

echo "🚀 Deploying Supabase Edge Function"
echo ""

# Create .supabase directory if needed
mkdir -p .supabase

# Check if already linked
if [ ! -f .supabase/project-ref ]; then
    echo "📋 Linking project..."
    echo "$PROJECT_REF" > .supabase/project-ref
fi

echo "📋 Setting environment variables..."

# Set SUPABASE_URL
echo "$SUPABASE_URL" | npx --yes supabase secrets set SUPABASE_URL 2>&1 || {
    echo "⚠️  Need to authenticate first. Running login..."
    echo "Please authenticate in the browser that opens..."
    npx --yes supabase login
    echo "$SUPABASE_URL" | npx --yes supabase secrets set SUPABASE_URL
}

# Set SERVICE_ROLE_KEY
echo "$SERVICE_ROLE_KEY" | npx --yes supabase secrets set SUPABASE_SERVICE_ROLE_KEY 2>&1 || {
    echo "Setting service role key..."
    echo "$SERVICE_ROLE_KEY" | npx --yes supabase secrets set SUPABASE_SERVICE_ROLE_KEY
}

echo "✅ Environment variables set"

echo ""
echo "📋 Deploying function..."
npx --yes supabase functions deploy run-agent --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo "Function URL: $SUPABASE_URL/functions/v1/run-agent"
