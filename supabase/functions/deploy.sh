#!/bin/bash

# =====================================================
# Supabase Edge Function Deployment Script
# =====================================================

set -e  # Exit on error

echo "🚀 Deploying Supabase Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "📦 Install with: npm install -g supabase"
    exit 1
fi

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "🔑 Please run: supabase login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Deploy explore-feed function
echo "📤 Deploying explore-feed function..."
supabase functions deploy explore-feed

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Apply database migration (20250127_explore_feed_performance_indices.sql)"
echo "   2. Test the function with: supabase functions logs explore-feed --follow"
echo "   3. Check webapp React Query DevTools to verify it's working"
echo ""
