# Explore Feed Edge Function

## Purpose
Batch API endpoint that fetches Projects, Collaborations, and Partners in a single request for optimal performance on the Explore page.

## Features
- **Batch Fetching**: Single endpoint returns all three entity types
- **My Items Priority**: User's own items appear first in results
- **Performance**: Parallel database queries reduce latency
- **Filtering**: Supports category, status, and search filters

## Request Body
```json
{
  "category": "fashion" | "beauty" | "music" | "art" | "tech" | undefined,
  "statuses": ["open", "in_progress"],
  "searchQuery": "optional search term",
  "limit": 5,
  "userId": "user-uuid-optional"
}
```

## Response
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "Project Title",
      "cover_image_url": "https://...",
      "created_by": "uuid",
      "created_at": "2025-01-27T...",
      "category": "fashion",
      "status": "open",
      "isMine": true
    }
  ],
  "collaborations": [...],
  "partners": [...]
}
```

## Deployment
```bash
# Deploy function
supabase functions deploy explore-feed

# Test locally
supabase functions serve explore-feed
```

## Performance Optimization
- Uses composite indexes: `(category, created_at DESC)`
- SELECT only required fields (no heavy joins)
- Parallel Promise.all for 3 entity types
- "My Items" query first (smaller dataset, faster)

## Database Requirements
- Requires indexes from migration: `20250127_explore_indices.sql`
- Depends on tables: `projects`, `collaborations`, `partners` view
