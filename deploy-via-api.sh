#!/bin/bash
set -e

echo "🚀 Deploying Supabase Edge Function via Management API"
echo ""

cd "$(dirname "$0")"

PROJECT_REF="fsavpausztpryaouplqz"
SUPABASE_URL="https://fsavpausztpryaouplqz.supabase.co"
FUNCTION_NAME="run-agent"
FUNCTION_DIR="supabase/functions/run-agent"

# Check if access token is provided
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN environment variable is required"
    echo ""
    echo "To get your access token:"
    echo "1. Go to https://supabase.com/account/tokens"
    echo "2. Create a new Personal Access Token"
    echo "3. Run: export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "4. Then run this script again"
    exit 1
fi

# Check if function directory exists
if [ ! -f "$FUNCTION_DIR/index.ts" ]; then
    echo "❌ Function file not found: $FUNCTION_DIR/index.ts"
    exit 1
fi

# Create a zip file of the function
echo "📦 Packaging function..."
TEMP_ZIP=$(mktemp).zip
cd "$FUNCTION_DIR"
zip -r "$TEMP_ZIP" . > /dev/null
cd - > /dev/null

# Create metadata JSON
METADATA=$(cat <<EOF
{
  "entrypoint_path": "index.ts",
  "name": "run-agent",
  "verify_jwt": false
}
EOF
)

# Deploy via Management API
echo "🚀 Deploying function..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/functions/deploy?slug=$FUNCTION_NAME" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "metadata=$METADATA" \
  -F "file=@$TEMP_ZIP")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Clean up
rm -f "$TEMP_ZIP"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "Function URL: $SUPABASE_URL/functions/v1/$FUNCTION_NAME"
else
    echo "❌ Deployment failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    exit 1
fi
