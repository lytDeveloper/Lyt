/**
 * Report Service
 * Handles creating and managing user reports for inappropriate content/behavior
 */

import { supabase } from '../lib/supabase';
import type { ReportType, ReportTargetType } from '../components/common/ReportModal';

// Report status type
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

// Report data interface
export interface Report {
    id: string;
    reporter_id: string;
    report_type: ReportType;
    reason: string;
    target_type: ReportTargetType;
    target_id: string;
    target_name?: string;
    description?: string;
    evidence_url?: string;
    attachments?: string[];
    status: ReportStatus;
    admin_notes?: string;
    resolved_by?: string;
    resolved_at?: string;
    created_at: string;
    updated_at: string;
}

// Create report input
export interface CreateReportInput {
    reportType: ReportType;
    reason: string;
    targetType: ReportTargetType;
    targetId: string;
    targetName?: string;
    description?: string;
    evidenceUrl?: string;
    attachmentFiles?: File[];
}

/**
 * Upload report attachment files to storage
 */
async function uploadAttachments(userId: string, files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error } = await supabase.storage
            .from('report_attatchments')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('[reportService] Error uploading attachment:', error);
            continue;
        }

        const { data: urlData } = supabase.storage
            .from('report_attatchments')
            .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
        }
    }

    return uploadedUrls;
}

/**
 * Create a new report
 */
export async function createReport(input: CreateReportInput): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        // Upload attachments if provided
        let attachmentUrls: string[] = [];
        if (input.attachmentFiles && input.attachmentFiles.length > 0) {
            attachmentUrls = await uploadAttachments(user.id, input.attachmentFiles);
        }

        const { data, error } = await supabase
            .from('reports')
            .insert({
                reporter_id: user.id,
                report_type: input.reportType,
                reason: input.reason,
                target_type: input.targetType,
                target_id: input.targetId,
                target_name: input.targetName || null,
                description: input.description || null,
                evidence_url: input.evidenceUrl || null,
                attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
                status: 'pending',
            })
            .select('id')
            .single();

        if (error) {
            console.error('[reportService] Error creating report:', error);
            return { success: false, error: '신고 접수 중 오류가 발생했어요.' };
        }

        return { success: true, reportId: data.id };
    } catch (error) {
        console.error('[reportService] createReport failed:', error);
        return { success: false, error: '신고 접수 중 오류가 발생했어요.' };
    }
}

/**
 * Get my submitted reports
 */
export async function getMyReports(): Promise<Report[]> {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('[reportService] User not authenticated');
            return [];
        }

        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('reporter_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[reportService] Error fetching reports:', error);
            return [];
        }

        return data as Report[];
    } catch (error) {
        console.error('[reportService] getMyReports failed:', error);
        return [];
    }
}

/**
 * Get all reports (admin only)
 */
export async function getAllReports(filters?: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    reportType?: ReportType;
}): Promise<Report[]> {
    try {
        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.targetType) {
            query = query.eq('target_type', filters.targetType);
        }
        if (filters?.reportType) {
            query = query.eq('report_type', filters.reportType);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[reportService] Error fetching all reports:', error);
            return [];
        }

        return data as Report[];
    } catch (error) {
        console.error('[reportService] getAllReports failed:', error);
        return [];
    }
}

/**
 * Update report status (admin only)
 */
export async function updateReportStatus(
    reportId: string,
    status: ReportStatus,
    adminNotes?: string
): Promise<boolean> {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('[reportService] User not authenticated');
            return false;
        }

        const updateData: Record<string, unknown> = {
            status,
            admin_notes: adminNotes || null,
        };

        if (status === 'resolved' || status === 'dismissed') {
            updateData.resolved_by = user.id;
            updateData.resolved_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('reports')
            .update(updateData)
            .eq('id', reportId);

        if (error) {
            console.error('[reportService] Error updating report:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[reportService] updateReportStatus failed:', error);
        return false;
    }
}

/**
 * Search result item for report target
 */
export interface ReportTargetSearchResult {
    id: string;
    name: string;
    role: 'fan' | 'brand' | 'artist' | 'creative';
    avatarUrl?: string;
}

/**
 * Search users for report target selection (debounced autocomplete)
 * Searches across profiles.nickname, profile_brands.brand_name, 
 * profile_artists.artist_name, profile_creatives.nickname
 */
export async function searchUsersForReport(query: string): Promise<ReportTargetSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
        const results: ReportTargetSearchResult[] = [];
        const searchQuery = `%${query}%`;

        // Search profile_brands (brand_name)
        const { data: brands } = await supabase
            .from('profile_brands')
            .select('profile_id, brand_name, logo_image_url')
            .ilike('brand_name', searchQuery)
            .limit(5);

        if (brands) {
            brands.forEach(b => {
                results.push({
                    id: b.profile_id,
                    name: b.brand_name,
                    role: 'brand',
                    avatarUrl: b.logo_image_url || undefined,
                });
            });
        }

        // Search profile_artists (artist_name)
        const { data: artists } = await supabase
            .from('profile_artists')
            .select('profile_id, artist_name, logo_image_url')
            .ilike('artist_name', searchQuery)
            .limit(5);

        if (artists) {
            artists.forEach(a => {
                results.push({
                    id: a.profile_id,
                    name: a.artist_name,
                    role: 'artist',
                    avatarUrl: a.logo_image_url || undefined,
                });
            });
        }

        // Search profile_creatives (nickname)
        const { data: creatives } = await supabase
            .from('profile_creatives')
            .select('profile_id, nickname, profile_image_url')
            .ilike('nickname', searchQuery)
            .limit(5);

        if (creatives) {
            creatives.forEach(c => {
                results.push({
                    id: c.profile_id,
                    name: c.nickname,
                    role: 'creative',
                    avatarUrl: c.profile_image_url || undefined,
                });
            });
        }

        // Search fans - nickname is in profiles table, joined with profile_fans
        const { data: fans } = await supabase
            .from('profile_fans')
            .select('profile_id, profile_image_url, profiles!inner(nickname)')
            .limit(5);

        // Filter fans by nickname from profiles table
        if (fans) {
            const filteredFans = fans.filter((f: any) =>
                f.profiles?.nickname?.toLowerCase().includes(query.toLowerCase())
            );
            filteredFans.forEach((f: any) => {
                results.push({
                    id: f.profile_id,
                    name: f.profiles?.nickname || 'Unknown',
                    role: 'fan',
                    avatarUrl: f.profile_image_url || undefined,
                });
            });
        }

        // Remove duplicates by ID and limit total results
        const uniqueResults = results.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        ).slice(0, 10);

        return uniqueResults;
    } catch (error) {
        console.error('[reportService] searchUsersForReport failed:', error);
        return [];
    }
}

// Export as service object for consistency
export const reportService = {
    createReport,
    getMyReports,
    getAllReports,
    updateReportStatus,
    searchUsersForReport,
};

