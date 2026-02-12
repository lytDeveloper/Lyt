import { supabase } from '../lib/supabase';

/**
 * Get a Set of project IDs that the user has hidden or blocked
 */
export const getExcludedProjectIds = async (userId: string): Promise<Set<string>> => {
    try {
        const { data, error } = await supabase
            .from('user_project_preferences')
            .select('project_id')
            .eq('profile_id', userId)
            .in('status', ['hidden', 'blocked']);

        if (error) {
            console.error('[preferenceHelpers] Error fetching excluded project IDs:', error);
            return new Set();
        }

        return new Set((data || []).map((item) => item.project_id));
    } catch (error) {
        console.error('[preferenceHelpers] getExcludedProjectIds failed:', error);
        return new Set();
    }
};

/**
 * Get a Set of collaboration IDs that the user has hidden or blocked
 */
export const getExcludedCollaborationIds = async (userId: string): Promise<Set<string>> => {
    try {
        const { data, error } = await supabase
            .from('user_collaboration_preferences')
            .select('collaboration_id')
            .eq('profile_id', userId)
            .in('status', ['hidden', 'blocked']);

        if (error) {
            console.error('[preferenceHelpers] Error fetching excluded collaboration IDs:', error);
            return new Set();
        }

        return new Set((data || []).map((item) => item.collaboration_id));
    } catch (error) {
        console.error('[preferenceHelpers] getExcludedCollaborationIds failed:', error);
        return new Set();
    }
};

/**
 * Get a Set of partner IDs that the user has hidden or blocked
 */
export const getExcludedPartnerIds = async (userId: string): Promise<Set<string>> => {
    try {
        const { data, error } = await supabase
            .from('user_partner_preferences')
            .select('partner_id')
            .eq('profile_id', userId)
            .in('status', ['hidden', 'blocked']);

        if (error) {
            console.error('[preferenceHelpers] Error fetching excluded partner IDs:', error);
            return new Set();
        }

        return new Set((data || []).map((item) => item.partner_id));
    } catch (error) {
        console.error('[preferenceHelpers] getExcludedPartnerIds failed:', error);
        return new Set();
    }
};
