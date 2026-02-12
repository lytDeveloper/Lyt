import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface RequestBody {
  category?: string;
  statuses: string[];
  searchQuery?: string;
  limit?: number;
  cursor?: string;  // Legacy: unified cursor (for backward compatibility)
  activeTab?: "projects" | "collaborations" | "partners";
  fetchMode?: "full" | "active-only";
  // Type-specific cursors for independent pagination
  projectsCursor?: string;
  collaborationsCursor?: string;
  partnersCursor?: string;
  userId?: string;
}

interface QueryOptions {
  category?: string;
  statuses: string[];
  searchQuery?: string;
  limit: number;
  cursor?: string;  // Type-specific cursor (set per query)
  userId?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const {
      category,
      statuses = [],
      searchQuery,
      limit = 10,
      cursor,  // Legacy unified cursor
      activeTab,
      fetchMode = "full",
      projectsCursor,
      collaborationsCursor,
      partnersCursor,
      userId
    } = body;
    const isAnonymous = !userId;
    const allowedAnonymousStatuses = ["open", "in_progress"];
    const normalizedStatuses = Array.isArray(statuses) ? statuses : [];
    const filteredStatuses = normalizedStatuses.filter((status) => allowedAnonymousStatuses.includes(status));
    const effectiveStatuses = isAnonymous
      ? (filteredStatuses.length > 0 ? filteredStatuses : allowedAnonymousStatuses)
      : normalizedStatuses;

    console.log("[explore-feed] Request body:", JSON.stringify({
      category, statuses, searchQuery, limit,
      activeTab,
      fetchMode,
      cursor: cursor ? "***" : undefined,
      projectsCursor: projectsCursor ? "***" : undefined,
      collaborationsCursor: collaborationsCursor ? "***" : undefined,
      partnersCursor: partnersCursor ? "***" : undefined,
      userId: userId ? "***" : undefined
    }));

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use type-specific cursors if provided, otherwise fall back to unified cursor
    const projectsOptions: QueryOptions = {
      category,
      statuses: effectiveStatuses,
      searchQuery,
      limit,
      cursor: projectsCursor || cursor,  // Type-specific > unified > undefined
      userId,
    };

    const collaborationsOptions: QueryOptions = {
      category,
      statuses: effectiveStatuses,
      searchQuery,
      limit,
      cursor: collaborationsCursor || cursor,
      userId,
    };

    const partnersOptions: QueryOptions = {
      category,
      statuses,
      searchQuery,
      limit,
      cursor: partnersCursor || cursor,
      userId,
    };

    const isActiveOnly = fetchMode === "active-only";
    const shouldFetchProjects = !isActiveOnly || activeTab === "projects";
    const shouldFetchCollaborations = !isActiveOnly || activeTab === "collaborations";
    const shouldFetchPartners = !isActiveOnly || activeTab === "partners";

    const emptyFeedResult = { data: [], _hasMore: false, _cursor: null };

    // Fetch only the active tab in active-only mode
    const [projectsResult, collaborationsResult, partnersResult, brandsResult, boostsResult] = await Promise.all([
      shouldFetchProjects ? fetchProjects(supabase, projectsOptions) : Promise.resolve(emptyFeedResult),
      shouldFetchCollaborations ? fetchCollaborations(supabase, collaborationsOptions) : Promise.resolve(emptyFeedResult),
      shouldFetchPartners ? fetchPartners(supabase, partnersOptions) : Promise.resolve({ data: [] }),
      shouldFetchPartners ? fetchBrands(supabase, partnersOptions) : Promise.resolve({ data: [] }),
      shouldFetchPartners ? fetchActiveBoosts(supabase) : Promise.resolve([]),
    ]);

    // Handle Boosted Partners
    let boostedPartners: any[] = [];
    if (boostsResult && boostsResult.length > 0 && !partnersOptions.cursor) {
      // 1페이지(커서 없음)일 때만 부스트 아이템 노출
      const boostedUserIds = boostsResult.sort((a: any, b: any) => a.rank_position - b.rank_position).map((b: any) => b.user_id);

      // 부스트된 유저들의 정보 가져오기 (ID 순서 유지)
      const { data: boostedInfo } = await supabase
        .from("partners")
        .select("*")
        .in("id", boostedUserIds);

      const { data: boostedBrands } = await supabase
        .from("profile_brands")
        .select("profile_id, brand_name, logo_image_url, cover_image_url, activity_field, region, target_audiences, description, created_at")
        .in("profile_id", boostedUserIds);

      // Map brands to partner format
      const mappedBoostedBrands = (boostedBrands || []).map((brand: any) => ({
        id: brand.profile_id,
        name: brand.brand_name,
        profile_image_url: brand.logo_image_url,
        cover_image_url: brand.cover_image_url,
        activity_field: brand.activity_field,
        region: brand.region || "",
        role: "brand",
        specialized_roles: brand.target_audiences || [],
        tags: [],
        bio: brand.description || "",
        rating: null,
        review_count: 0,
        completed_projects: 0,
        matching_rate: null,
        response_rate: null,
        response_time: null,
        career: "",
        is_online: false,
        is_verified: false,
        portfolio_images: [],
        career_history: [],
        created_at: brand.created_at,
      }));

      const allBoostedInfo = [...(boostedInfo || []), ...mappedBoostedBrands];

      // 순위 순서대로 정렬
      boostedPartners = boostedUserIds.map(id => allBoostedInfo.find(p => p.id === id)).filter(Boolean);
    }

    // Merge partners and brands, filter out boosted ones to avoid duplicates
    const boostedIds = boostedPartners.map(p => p.id);
    const normalPartners = [...(partnersResult.data || []), ...(brandsResult.data || [])]
      .filter(p => !boostedIds.includes(p.id))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const mergedPartners = [...boostedPartners, ...normalPartners]
      .slice(0, limit);  // Limit to requested count

    const allItemsCount = (projectsResult.data?.length || 0) +
      (collaborationsResult.data?.length || 0) +
      mergedPartners.length;

    console.log("[explore-feed] Results:", {
      projectsCount: projectsResult.data?.length || 0,
      collaborationsCount: collaborationsResult.data?.length || 0,
      brandsCount: brandsResult.data?.length || 0,
      partnersCount: partnersResult.data?.length || 0,
    });

    // INDEPENDENT CURSORS PER TYPE
    // Each type has its own cursor based on the LAST item returned (regardless of hasMore)
    // This ensures proper pagination for each tab independently
    const adjustCursor = (cursor: string | null): string | null => {
      if (!cursor) return null;
      // Subtract 1 millisecond to ensure we don't miss items with the same timestamp
      const date = new Date(cursor);
      date.setMilliseconds(date.getMilliseconds() - 1);
      return date.toISOString();
    };

    // Get the oldest created_at from returned items for each type
    // This is the cursor for the next page
    const getOldestCreatedAt = (items: any[]): string | null => {
      if (!items || items.length === 0) return null;
      // Find the oldest created_at among all returned items
      return items.reduce((oldest: string | null, item: any) => {
        const createdAt = item.created_at;
        if (!createdAt) return oldest;
        if (!oldest) return createdAt;
        return new Date(createdAt) < new Date(oldest) ? createdAt : oldest;
      }, null);
    };

    // _cursor 사용: "다른 사용자" 항목의 커서 (내 항목 제외)
    // "내 항목"이 오래된 경우에도 후속 페이지 정상 작동
    // Note: Using "next*" prefix to avoid conflict with input cursors from request body
    const nextProjectsCursor = (projectsResult as any)._hasMore
      ? adjustCursor((projectsResult as any)._cursor)
      : null;
    const nextCollaborationsCursor = (collaborationsResult as any)._hasMore
      ? adjustCursor((collaborationsResult as any)._cursor)
      : null;
    // Check if there's more data for each type
    // hasMore is true if we got exactly 'limit' items (might be more)
    const hasMoreProjects = (projectsResult as any)._hasMore || false;
    const hasMoreCollaborations = (collaborationsResult as any)._hasMore || false;
    const hasMorePartners =
      (partnersResult.data?.length || 0) === limit ||
      (brandsResult.data?.length || 0) === limit;
    const partnerAndBrandItems = [...(partnersResult.data || []), ...(brandsResult.data || [])];
    const nextPartnersCursor = hasMorePartners
      ? adjustCursor(getOldestCreatedAt(partnerAndBrandItems))
      : null;
    const hasMore = hasMoreProjects || hasMoreCollaborations || hasMorePartners;

    // Legacy: Keep nextCursor for backward compatibility (uses newest among all)
    const allCursors = [nextProjectsCursor, nextCollaborationsCursor, nextPartnersCursor].filter(Boolean) as string[];
    const nextCursor = allCursors.length > 0
      ? allCursors.reduce((newest, cur) => {
        if (!newest) return cur;
        return new Date(cur) > new Date(newest) ? cur : newest;
      }, allCursors[0])
      : null;

    // Only return nextCursor if:
    // 1. We have data in current page (allItemsCount > 0)
    // 2. There might be more data (hasMore)
    // 3. We have a valid cursor (nextCursor)
    // If any of these conditions fail, return null to stop pagination
    const finalNextCursor = (allItemsCount > 0 && hasMore && nextCursor) ? nextCursor : null;

    // Extra safety: If we're on a subsequent page (cursor exists) and got 0 results, definitely stop
    if (cursor && allItemsCount === 0) {
      console.log("[explore-feed] No more data: cursor exists but 0 results returned");
    }

    // Debug info
    console.log("[explore-feed] Final decision:", {
      allItemsCount,
      hasMore,
      hasMoreProjects,
      hasMoreCollaborations,
      hasMorePartners,
      projectsCursor: nextProjectsCursor ? "***" : null,
      collaborationsCursor: nextCollaborationsCursor ? "***" : null,
      partnersCursor: nextPartnersCursor ? "***" : null,
      finalNextCursor: finalNextCursor ? "***" : null,
    });

    return new Response(
      JSON.stringify({
        projects: projectsResult.data,
        collaborations: collaborationsResult.data,
        partners: mergedPartners,
        // Type-specific cursors for independent pagination
        projectsCursor: nextProjectsCursor,
        collaborationsCursor: nextCollaborationsCursor,
        partnersCursor: nextPartnersCursor,
        // Legacy: unified cursor (for backward compatibility)
        nextCursor: finalNextCursor,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[explore-feed] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

/**
 * Fetch projects with "My Items" priority and cursor-based pagination
 * Returns user's projects first on page 1, then others on subsequent pages
 */
async function fetchProjects(supabase: any, options: QueryOptions) {
  const { category, statuses, searchQuery, limit, cursor, userId } = options;

  // Get excluded project IDs (hidden or blocked) for the current user
  let excludedProjectIds: string[] = [];
  // Get blocked user IDs to exclude their projects
  let blockedUserIds: string[] = [];
  if (userId) {
    const [projectPrefs, userPrefs] = await Promise.all([
      supabase
        .from("user_project_preferences")
        .select("project_id")
        .eq("profile_id", userId)
        .in("status", ["hidden", "blocked"]),
      supabase
        .from("user_partner_preferences")
        .select("partner_id")
        .eq("profile_id", userId)
        .eq("status", "blocked"),
    ]);
    if (projectPrefs.data && Array.isArray(projectPrefs.data)) {
      excludedProjectIds = projectPrefs.data.map((p: any) => p.project_id);
    }
    if (userPrefs.data && Array.isArray(userPrefs.data)) {
      blockedUserIds = userPrefs.data.map((p: any) => p.partner_id);
    }
  }

  // Helper: Apply common filters to query
  const applyFilters = (query: any, excludeCursor = false) => {
    let q = query;
    if (category && category !== "전체") {
      q = q.eq("category", category);
    }
    if (statuses && statuses.length > 0) {
      q = q.in("status", statuses);
    }
    if (searchQuery) {
      q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (cursor && !excludeCursor) {
      q = q.lt("created_at", cursor);
    }
    // Apply hidden/blocked filter for individual projects
    if (excludedProjectIds.length > 0) {
      q = q.not("id", "in", `(${excludedProjectIds.join(",")})`);
    }
    // Exclude projects created by blocked users
    if (blockedUserIds.length > 0) {
      q = q.not("created_by", "in", `(${blockedUserIds.join(",")})`);
    }
    return q;
  };

  // SELECT 쿼리: 리스트 카드에 필요한 최소 필드만 조회
  const projectSelectFields = `
    id, title, description, cover_image_url, created_by, created_at, 
    category, status, budget_range, deadline, tags, team_size, current_team_size, skills, 
    workflow_steps, files, settlement_status
  `;

  // First page (no cursor): Prioritize "My Projects" with first-page cap
  if (!cursor && userId) {
    let myProjects: any[] = [];
    let featuredProjects: any[] = [];
    let otherProjects: any[] = [];

    // 1. Fetch my projects with page cap
    let myQuery = supabase
      .from("projects")
      .select(projectSelectFields);
    myQuery = applyFilters(myQuery, true); // Don't apply cursor filter
    myQuery = myQuery.eq("created_by", userId);

    const { data: mine, error: myError } = await myQuery
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!myError && mine) {
      myProjects = mine.map((p: any) => ({ ...p, isMine: true }));
    }

    const featuredLimit = Math.max(0, limit - myProjects.length);

    // 2. Featured projects (max 5, exclude my projects)
    let featuredQuery = supabase
      .from("projects")
      .select(projectSelectFields);
    featuredQuery = applyFilters(featuredQuery, true);
    featuredQuery = featuredQuery
      .eq("is_explore_featured", true)
      .neq("created_by", userId);

    const { data: featured, error: featuredError } = await featuredQuery
      .order("explore_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(5, featuredLimit));

    if (!featuredError && featured) {
      featuredProjects = featured.map((p: any) => ({ ...p, isMine: false }));
    }

    // 3. Always fetch "other projects" (limit count) for accurate cursor calculation
    // Even if my projects fill the limit, we need to know if there are more "other" projects
    let otherQuery = supabase
      .from("projects")
      .select(projectSelectFields);
    otherQuery = applyFilters(otherQuery, true); // Don't apply cursor filter
    otherQuery = otherQuery.neq("created_by", userId);
    otherQuery = otherQuery.eq("is_explore_featured", false);

    const { data: others, error: otherError } = await otherQuery
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!otherError && others) {
      otherProjects = others.map((p: any) => ({ ...p, isMine: false }));
    }

    // Combine: My projects, featured projects, then other projects (capped)
    const result = [...myProjects, ...featuredProjects, ...otherProjects].slice(0, limit);

    // Calculate hasMore based on "other projects" count
    // If we got exactly 'limit' other projects, there might be more
    const hasMore = otherProjects.length === limit;

    // Calculate cursor based on the oldest "other project" (not my projects)
    // This ensures subsequent pages don't show my projects again
    const oldestOther = otherProjects.length > 0
      ? otherProjects[otherProjects.length - 1].created_at
      : null;

    return {
      data: result,
      _hasMore: hasMore,
      _cursor: oldestOther, // Used for cursor calculation
    };
  } else {
    // Subsequent pages (with cursor): Only fetch other projects
    let query = supabase
      .from("projects")
      .select(projectSelectFields);
    query = applyFilters(query);

    if (userId) {
      query = query.neq("created_by", userId); // Exclude my projects
    }
    query = query.eq("is_explore_featured", false);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[fetchProjects] Error:", JSON.stringify(error));
      return { data: [] };
    }

    const result = (data || []).map((p: any) => ({ ...p, isMine: false }));

    return {
      data: result,
      _hasMore: result.length === limit,
      _cursor: result.length > 0 ? result[result.length - 1].created_at : null,
    };
  }
}

/**
 * Fetch collaborations with "My Items" priority and cursor-based pagination
 * Returns user's collaborations first on page 1, then others on subsequent pages
 */
async function fetchCollaborations(supabase: any, options: QueryOptions) {
  const { category, statuses, searchQuery, limit, cursor, userId } = options;

  // Get excluded collaboration IDs (hidden or blocked) for the current user
  let excludedCollaborationIds: string[] = [];
  // Get blocked user IDs to exclude their collaborations
  let blockedUserIds: string[] = [];
  if (userId) {
    const [collabPrefs, userPrefs] = await Promise.all([
      supabase
        .from("user_collaboration_preferences")
        .select("collaboration_id")
        .eq("profile_id", userId)
        .in("status", ["hidden", "blocked"]),
      supabase
        .from("user_partner_preferences")
        .select("partner_id")
        .eq("profile_id", userId)
        .eq("status", "blocked"),
    ]);
    if (collabPrefs.data && Array.isArray(collabPrefs.data)) {
      excludedCollaborationIds = collabPrefs.data.map((c: any) => c.collaboration_id);
    }
    if (userPrefs.data && Array.isArray(userPrefs.data)) {
      blockedUserIds = userPrefs.data.map((p: any) => p.partner_id);
    }
  }

  // Helper: Apply common filters to query
  const applyFilters = (query: any, excludeCursor = false) => {
    let q = query;
    if (category && category !== "전체") {
      q = q.eq("category", category);
    }
    if (statuses && statuses.length > 0) {
      q = q.in("status", statuses);
    }
    if (searchQuery) {
      q = q.or(`title.ilike.%${searchQuery}%,brief_description.ilike.%${searchQuery}%`);
    }
    if (cursor && !excludeCursor) {
      q = q.lt("created_at", cursor);
    }
    // Apply hidden/blocked filter for individual collaborations
    if (excludedCollaborationIds.length > 0) {
      q = q.not("id", "in", `(${excludedCollaborationIds.join(",")})`);
    }
    // Exclude collaborations created by blocked users
    if (blockedUserIds.length > 0) {
      q = q.not("created_by", "in", `(${blockedUserIds.join(",")})`);
    }
    return q;
  };

  // SELECT 쿼리: 리스트 카드에 필요한 최소 필드만 조회
  const collaborationSelectFields = `
    id, title, cover_image_url, brief_description, created_by, created_at, 
    category, status, collaboration_type, description, skills, tags, 
    team_size, current_team_size, requirements, benefits, workflow_steps, files
  `;

  // First page (no cursor): Prioritize "My Collaborations" with first-page cap
  if (!cursor && userId) {
    let myCollaborations: any[] = [];
    let featuredCollaborations: any[] = [];
    let otherCollaborations: any[] = [];

    // 1. Fetch my collaborations with page cap
    let myQuery = supabase
      .from("collaborations")
      .select(collaborationSelectFields);
    myQuery = applyFilters(myQuery, true);
    myQuery = myQuery.eq("created_by", userId);

    const { data: mine, error: myError } = await myQuery
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!myError && mine) {
      myCollaborations = mine.map((c: any) => ({ ...c, isMine: true }));
    }

    const featuredLimit = Math.max(0, limit - myCollaborations.length);

    // 2. Featured collaborations (max 5, exclude my collaborations)
    let featuredQuery = supabase
      .from("collaborations")
      .select(collaborationSelectFields);
    featuredQuery = applyFilters(featuredQuery, true);
    featuredQuery = featuredQuery
      .eq("is_explore_featured", true)
      .neq("created_by", userId);

    const { data: featured, error: featuredError } = await featuredQuery
      .order("explore_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(5, featuredLimit));

    if (!featuredError && featured) {
      featuredCollaborations = featured.map((c: any) => ({ ...c, isMine: false }));
    }

    // 3. Always fetch "other collaborations" (limit count) for accurate cursor calculation
    let otherQuery = supabase
      .from("collaborations")
      .select(collaborationSelectFields);
    otherQuery = applyFilters(otherQuery, true);
    otherQuery = otherQuery.neq("created_by", userId);

    const { data: others, error: otherError } = await otherQuery
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!otherError && others) {
      otherCollaborations = others.map((c: any) => ({ ...c, isMine: false }));
    }

    // Combine: My collaborations, featured collaborations, then other collaborations (capped)
    const result = [...myCollaborations, ...featuredCollaborations, ...otherCollaborations].slice(0, limit);

    // Calculate hasMore based on "other collaborations" count
    const hasMore = otherCollaborations.length === limit;

    // Calculate cursor based on the oldest "other collaboration"
    const oldestOther = otherCollaborations.length > 0
      ? otherCollaborations[otherCollaborations.length - 1].created_at
      : null;

    return {
      data: result,
      _hasMore: hasMore,
      _cursor: oldestOther,
    };
  } else {
    // Subsequent pages (with cursor): Only fetch other collaborations
    let query = supabase
      .from("collaborations")
      .select(collaborationSelectFields);
    query = applyFilters(query);

    if (userId) {
      query = query.neq("created_by", userId);
    }
    query = query.eq("is_explore_featured", false);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[fetchCollaborations] Error:", JSON.stringify(error));
      return { data: [] };
    }

    const result = (data || []).map((c: any) => ({ ...c, isMine: false }));

    return {
      data: result,
      _hasMore: result.length === limit,
      _cursor: result.length > 0 ? result[result.length - 1].created_at : null,
    };
  }
}

/**
 * Fetch partners with cursor-based pagination
 * Partners come from profile_artists and profile_creatives
 * Note: These tables use 'activity_field' instead of 'category'
 */
async function fetchPartners(supabase: any, options: QueryOptions) {
  const { category, searchQuery, limit, cursor, userId } = options;

  // Get excluded partner IDs (hidden or blocked) for the current user
  let excludedPartnerIds: string[] = [];
  if (userId) {
    const { data: prefs } = await supabase
      .from("user_partner_preferences")
      .select("partner_id")
      .eq("profile_id", userId)
      .in("status", ["hidden", "blocked"]);
    if (prefs && Array.isArray(prefs)) {
      excludedPartnerIds = prefs.map((p: any) => p.partner_id);
    }
  }

  // Category to Korean label mapping (matches CATEGORY_LABELS in projectConstants.ts)
  const CATEGORY_TO_KOREAN: Record<string, string> = {
    music: "음악",
    fashion: "패션",
    beauty: "뷰티",
    contents: "콘텐츠",
    market: "마켓",
    Investment: "재테크",
    liveShopping: "라이브쇼핑",
    event: "이벤트",
    ticket: "문화",
    tech: "디지털",
    life: "라이프",
    healing: "힐링",
  };

  // Assuming partners is a VIEW or we query both tables
  // Partners VIEW should map activity_field to the explore category filter
  // Schema: profile_artists and profile_creatives both have activity_field
  let query = supabase
    .from("partners")
    .select("id, name, profile_image_url, cover_image_url, activity_field, role, rating, review_count, completed_projects, region, matching_rate, response_rate, response_time, career, is_online, is_verified, specialized_roles, tags, bio, portfolio_images, career_history, created_at");

  // Filter by activity_field (maps to category in explore feed)
  // Partners store activity_field in Korean, so we need to convert English category to Korean
  // Only filter if category is explicitly set and not "전체"
  // If category is undefined, fetch all partners
  if (category && category !== "전체" && category !== undefined) {
    // Convert English category to Korean label
    const koreanCategory = CATEGORY_TO_KOREAN[category] || category;
    // Use ilike for case-insensitive matching and partial matching
    // activity_field might contain the category label as part of a longer string (e.g., "음악, 패션")
    // Use ilike with %pattern% for partial matching
    query = query.ilike("activity_field", `%${koreanCategory}%`);
    console.log("[fetchPartners] Converting category:", { english: category, korean: koreanCategory });
  }

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
  }

  // Cursor-based pagination: only fetch items before cursor timestamp
  if (cursor) {
    query = query.lt("created_at", cursor);
    console.log("[fetchPartners] Applying cursor filter: created_at <", cursor);
  }

  console.log("[fetchPartners] Query params:", {
    category,
    searchQuery,
    cursor,
    limit,
    willFilterByCategory: !!(category && category !== "전체" && category !== undefined),
  });

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchPartners] Error:", JSON.stringify(error));
    console.error("[fetchPartners] Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { data: [] };
  }

  console.log("[fetchPartners] Partners count:", data?.length || 0);
  if (data && data.length > 0) {
    console.log("[fetchPartners] Sample partner created_at:", data[0].created_at);
    console.log("[fetchPartners] Sample partner activity_field:", data[0].activity_field);
  } else if (category && category !== "전체" && category !== undefined) {
    // If no data with category filter, check what activity_field values exist
    const koreanCategory = CATEGORY_TO_KOREAN[category] || category;
    const { data: samplePartners } = await supabase
      .from("partners")
      .select("activity_field")
      .limit(10);
    console.log("[fetchPartners] Sample activity_field values in DB:", samplePartners?.map(p => p.activity_field));
    console.log("[fetchPartners] Looking for category:", koreanCategory);
  } else {
    // If no data with cursor, check what's happening
    if (cursor) {
      // Check how many partners exist before this cursor
      const { count: countBeforeCursor } = await supabase
        .from("partners")
        .select("*", { count: "exact", head: true })
        .lt("created_at", cursor);
      console.log("[fetchPartners] Partners before cursor:", countBeforeCursor);

      // Check the latest partner's created_at
      const { data: latestPartner } = await supabase
        .from("partners")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log("[fetchPartners] Latest partner created_at:", latestPartner?.created_at);

      // Check if cursor is in the future
      const cursorDate = new Date(cursor);
      const latestDate = latestPartner?.created_at ? new Date(latestPartner.created_at) : null;
      if (latestDate) {
        console.log("[fetchPartners] Cursor vs Latest:", {
          cursor: cursorDate.toISOString(),
          latest: latestDate.toISOString(),
          cursorIsAfterLatest: cursorDate > latestDate,
        });
      }
    } else {
      // If no data without cursor, check total count
      const { count } = await supabase
        .from("partners")
        .select("*", { count: "exact", head: true });
      console.log("[fetchPartners] Total partners in DB:", count);
    }
  }

  // Apply blocking filter
  if (excludedPartnerIds.length > 0 && data) {
    const filtered = data.filter((p: any) => !excludedPartnerIds.includes(p.id));
    return { data: filtered };
  }

  return { data: data || [] };
}

/**
 * Fetch brands from profile_brands and map to Partner format
 * Brands are included in the partners tab alongside artists/creatives
 */
async function fetchBrands(supabase: any, options: QueryOptions) {
  const { category, searchQuery, limit, cursor, userId } = options;

  // Get excluded partner IDs (hidden or blocked) for the current user
  let excludedIds: string[] = [];
  if (userId) {
    const { data: prefs } = await supabase
      .from("user_partner_preferences")
      .select("partner_id")
      .eq("profile_id", userId)
      .in("status", ["hidden", "blocked"]);
    if (prefs && Array.isArray(prefs)) {
      excludedIds = prefs.map((p: any) => p.partner_id);
    }
  }

  // Category to Korean label mapping
  const CATEGORY_TO_KOREAN: Record<string, string> = {
    music: "음악",
    fashion: "패션",
    beauty: "뷰티",
    contents: "콘텐츠",
    market: "마켓",
    Investment: "재테크",
    liveShopping: "라이브쇼핑",
    event: "이벤트",
    ticket: "문화",
    tech: "디지털",
    life: "라이프",
    healing: "힐링",
  };

  let query = supabase
    .from("profile_brands")
    .select("profile_id, brand_name, logo_image_url, cover_image_url, activity_field, region, target_audiences, description, created_at")
    .eq("is_active", true);
  if (!userId) {
    query = query.eq("approval_status", "approved");
  }

  // Filter by activity_field
  if (category && category !== "전체" && category !== undefined) {
    const koreanCategory = CATEGORY_TO_KOREAN[category] || category;
    query = query.ilike("activity_field", `%${koreanCategory}%`);
  }

  if (searchQuery) {
    query = query.or(`brand_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  // Cursor-based pagination
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchBrands] Error:", JSON.stringify(error));
    return { data: [] };
  }

  // Map to Partner format
  const mappedBrands = (data || [])
    .filter((brand: any) => !excludedIds.includes(brand.profile_id))
    .map((brand: any) => ({
      id: brand.profile_id,
      name: brand.brand_name,
      profile_image_url: brand.logo_image_url,
      cover_image_url: brand.cover_image_url,
      activity_field: brand.activity_field,
      region: brand.region || "",
      role: "brand",
      // Map target_audiences to specialized_roles for display
      specialized_roles: brand.target_audiences || [],
      tags: [],
      bio: brand.description || "",
      rating: null,
      review_count: 0,
      completed_projects: 0,
      matching_rate: null,
      response_rate: null,
      response_time: null,
      career: "",
      is_online: false,
      is_verified: false,
      portfolio_images: [],
      career_history: [],
      created_at: brand.created_at,
    }));

  console.log("[fetchBrands] Brands count:", mappedBrands.length);

  return { data: mappedBrands };
}

/**
 * Fetch active explore boosts
 */
async function fetchActiveBoosts(supabase: any) {
  const { data, error } = await supabase
    .from("explore_boosts")
    .select("user_id, rank_position")
    .gt("ends_at", new Date().toISOString())
    .order("rank_position", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[fetchActiveBoosts] Error:", JSON.stringify(error));
    return [];
  }

  return data;
}
