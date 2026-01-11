#!/bin/bash

# ============================================
# Deploy RLS Fixes to Supabase
# ============================================

set -e  # Exit on error

echo "🔧 Deploying RLS Policy Fixes to Supabase..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Error: SUPABASE_URL not set in .env"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_KEY not set in .env"
    echo "⚠️  Without the service key, we cannot deploy RLS fixes"
    exit 1
fi

# Extract database connection string from SUPABASE_URL
DB_HOST="${SUPABASE_URL#https://}"
DB_HOST="${DB_HOST%%.*}"
PROJECT_REF="$DB_HOST"

echo "📊 Supabase Project: $PROJECT_REF"
echo ""

# SQL file to deploy
SQL_FILE="db/phase3.2-fix-all-rls-bugs.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: $SQL_FILE not found"
    exit 1
fi

echo "📁 SQL File: $SQL_FILE"
echo ""
echo "⚠️  MANUAL DEPLOYMENT REQUIRED"
echo ""
echo "Unfortunately, we cannot automatically deploy SQL to Supabase without"
echo "the database password. Please deploy manually:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy the contents of: $SQL_FILE"
echo "3. Paste into the SQL Editor"
echo "4. Click 'Run' button"
echo "5. Verify no errors appear"
echo ""
echo "Alternatively, you can use the Supabase CLI:"
echo ""
echo "  supabase db push --db-url \"postgresql://postgres:[YOUR-PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres\" < $SQL_FILE"
echo ""
echo "Get your database password from:"
echo "  https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""

# Open SQL file in default editor for easy copying
if command -v pbcopy &> /dev/null; then
    cat "$SQL_FILE" | pbcopy
    echo "✅ SQL has been copied to clipboard (macOS)"
    echo ""
fi

echo "Would you like to open the Supabase SQL Editor in your browser? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    open "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    echo "✅ Opened Supabase SQL Editor"
fi

echo ""
echo "After deploying, verify the policies were created:"
echo ""
echo "  SELECT tablename, policyname FROM pg_policies"
echo "  WHERE tablename IN ('align120_sessions', 'strategic_foundations', 'context_assets')"
echo "  ORDER BY tablename;"
echo ""
