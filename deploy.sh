#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null && ! npx --yes supabase --version &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Using npx...${NC}"
    SUPABASE_CMD="npx --yes supabase"
else
    SUPABASE_CMD="supabase"
fi

# Function to deploy Supabase edge function
deploy_supabase_function() {
    echo -e "\n${GREEN}📦 Deploying Supabase Edge Function...${NC}"
    
    cd "$(dirname "$0")"
    
    # Check if project is linked
    if [ ! -f .supabase/project-ref ]; then
        echo -e "${YELLOW}⚠️  Project not linked. Please run:${NC}"
        echo "   $SUPABASE_CMD login"
        echo "   $SUPABASE_CMD link --project-ref <your-project-ref>"
        read -p "Have you already linked your project? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Please link your project first and run this script again.${NC}"
            exit 1
        fi
    fi
    
    # Deploy the function
    echo "Deploying run-agent function..."
    $SUPABASE_CMD functions deploy run-agent --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Supabase function deployed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to deploy Supabase function${NC}"
        exit 1
    fi
}

# Function to deploy Next.js app
deploy_nextjs_app() {
    echo -e "\n${GREEN}🌐 Deploying Next.js App to Vercel...${NC}"
    
    cd "$(dirname "$0")/web"
    
    # Check if environment variables are set
    echo "Checking Vercel environment variables..."
    if ! vercel env ls | grep -q "NEXT_PUBLIC_SUPABASE_URL"; then
        echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_URL not found in Vercel${NC}"
        echo "Please set it with: vercel env add NEXT_PUBLIC_SUPABASE_URL production"
    fi
    
    if ! vercel env ls | grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY"; then
        echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not found in Vercel${NC}"
        echo "Please set it with: vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production"
    fi
    
    # Deploy to production
    echo "Deploying to Vercel production..."
    vercel --prod --yes
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Next.js app deployed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to deploy Next.js app${NC}"
        exit 1
    fi
}

# Main deployment flow
echo "What would you like to deploy?"
echo "1) Supabase Edge Function only"
echo "2) Next.js App only"
echo "3) Both"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        deploy_supabase_function
        ;;
    2)
        deploy_nextjs_app
        ;;
    3)
        deploy_supabase_function
        deploy_nextjs_app
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
