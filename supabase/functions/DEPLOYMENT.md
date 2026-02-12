# Supabase Edge Functions Deployment Guide

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link project**:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

## Deploying Edge Functions

### Deploy All Functions
```bash
# From project root
supabase functions deploy
```

### Deploy Specific Function
```bash
# Deploy explore-feed function
supabase functions deploy explore-feed

# Deploy with no JWT verification (if needed)
supabase functions deploy explore-feed --no-verify-jwt
```

## Testing Functions

### Test Locally
```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve explore-feed

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/explore-feed' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "category": "fashion",
    "statuses": ["open", "in_progress"],
    "limit": 5
  }'
```

### Test Production
```bash
# Using webapp (already integrated)
# The useExploreFeed hook will automatically call the Edge Function

# Or test directly with curl:
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/explore-feed' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "category": "beauty",
    "statuses": ["open"],
    "searchQuery": "collaboration",
    "limit": 10,
    "userId": "user-uuid-here"
  }'
```

## Database Migration

### Apply Indexes Migration
```bash
# Run migration in Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20250127_explore_feed_performance_indices.sql
# Execute in SQL Editor

# Or use Supabase CLI:
supabase db push
```

### Verify Indexes
Run in SQL Editor:
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('projects', 'collaborations')
ORDER BY idx_scan DESC;

-- Test query performance
EXPLAIN ANALYZE
SELECT id, title, cover_image_url, created_by, created_at, category, status
FROM projects
WHERE category = 'fashion'
  AND status IN ('open', 'in_progress')
ORDER BY created_at DESC
LIMIT 5;
```

## Environment Variables

Edge Functions use these Supabase environment variables automatically:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has full access)

No additional configuration needed.

## Monitoring

### View Function Logs
```bash
# Live logs
supabase functions logs explore-feed --follow

# Recent logs
supabase functions logs explore-feed --limit 100
```

### Check Function Status
```bash
# List all deployed functions
supabase functions list
```

## Rollback

If deployment fails or causes issues:

1. **Redeploy previous version**:
   ```bash
   git checkout <previous-commit>
   supabase functions deploy explore-feed
   ```

2. **Check logs for errors**:
   ```bash
   supabase functions logs explore-feed --limit 50
   ```

3. **Test locally first**:
   ```bash
   supabase functions serve explore-feed
   ```

## Performance Checklist

After deployment, verify:

- [ ] Edge Function responds within 500ms
- [ ] Database indexes are being used (check EXPLAIN ANALYZE)
- [ ] "My Items" appear first in results
- [ ] Fallback logic works if Edge Function fails
- [ ] React Query cache is working (check DevTools)

## Common Issues

### Issue: Function times out
**Solution**: Check if indexes are applied. Run EXPLAIN ANALYZE on queries.

### Issue: CORS errors
**Solution**: Verify corsHeaders in index.ts includes correct origins.

### Issue: Authentication errors
**Solution**: Check if Authorization header is being sent from webapp.

### Issue: Empty results
**Solution**: Check if tables have data. Verify RLS policies allow reading.

## Next Steps

After successful deployment:
1. Monitor logs for errors
2. Check React Query DevTools in webapp
3. Verify "My Items" priority works correctly
4. Test with different filters (category, status, search)
5. Measure performance improvement (should be ~50% faster)
