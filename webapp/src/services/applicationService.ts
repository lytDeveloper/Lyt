/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../lib/supabase';
import type { ApplicationForm, ApplicationDetail, ApplicationStatus } from '../types/application';

class ApplicationService {
  /**
   * Check if the current user has already applied to the project or collaboration
   * Returns status and applicationId
   */
  async checkApplicationStatus(
    type: 'project' | 'collaboration',
    activityId: string
  ): Promise<{ status: ApplicationStatus | null; applicationId: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: null, applicationId: null };

    const table = type === 'project' ? 'project_applications' : 'collaboration_applications';
    const idField = type === 'project' ? 'project_id' : 'collaboration_id';

    const { data, error } = await supabase
      .from(table)
      .select('id, status')
      .eq(idField, activityId)
      .eq('applicant_id', user.id)
      .maybeSingle();

    if (error) {
      console.error(`[ApplicationService] Failed to check status for ${type} ${activityId}:`, error);
      return { status: null, applicationId: null };
    }

    return {
      status: data?.status as ApplicationStatus || null,
      applicationId: data?.id || null
    };
  }

  /**
   * Submit a new application
   */
  async submitApplication(
    type: 'project' | 'collaboration',
    activityId: string,
    form: ApplicationForm
  ): Promise<{ success: boolean; error?: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Get basic info about the activity (title, creator, team_size)
    const activityTable = type === 'project' ? 'projects' : 'collaborations';
    const { data: activity, error: activityError } = await supabase
      .from(activityTable)
      .select('id, title, created_by, team_size, current_team_size')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return { success: false, error: 'Activity not found' };
    }

    // 팀 사이즈 제한 확인
    if (activity.team_size && activity.current_team_size >= activity.team_size) {
      return { success: false, error: '팀 인원이 이미 가득 찼습니다' };
    }

    // 2. Check if there's an existing application (especially withdrawn)
    const appTable = type === 'project' ? 'project_applications' : 'collaboration_applications';
    const idField = type === 'project' ? 'project_id' : 'collaboration_id';

    const { data: existingApplication } = await supabase
      .from(appTable)
      .select('id, status')
      .eq(idField, activityId)
      .eq('applicant_id', user.id)
      .maybeSingle();

    // 3. If withdrawn application exists, update it; otherwise insert new
    if (existingApplication) {
      // Check if it's withdrawn - allow re-application
      if (existingApplication.status === 'withdrawn') {
        const { error: updateError } = await supabase
          .from(appTable)
          .update({
            cover_letter: form.coverLetter,
            portfolio_links: form.portfolioLinks,
            resume_url: form.resumeUrl,
            status: 'pending',
            availability: form.availableTime,
            applied_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingApplication.id);

        if (updateError) {
          return { success: false, error: updateError };
        }

        return { success: true };
      } else {
        // Already applied with other status (pending, accepted, rejected, etc.)
        return { success: false, error: 'Already applied' };
      }
    }

    // 4. Insert new application
    const { error: insertError } = await supabase
      .from(appTable)
      .insert({
        [idField]: activityId,
        applicant_id: user.id,
        cover_letter: form.coverLetter,
        portfolio_links: form.portfolioLinks,
        resume_url: form.resumeUrl,
        status: 'pending',
        // Map other optional fields if they exist in your form/schema
        availability: form.availableTime,
      });

    if (insertError) {
      // Check for unique violation (already applied)
      if (insertError.code === '23505') {
        return { success: false, error: 'Already applied' };
      }
      return { success: false, error: insertError };
    }

    // 5. 지원서 제출 활동 기록
    try {
      const { activityService } = await import('./activityService');
      await activityService.createActivityViaRPC({
        userId: user.id,
        activityType: 'application_submitted',
        relatedEntityType: type,
        relatedEntityId: activityId,
        title: `${activity.title} 지원서를 제출했어요`,
        description: '',
        metadata: {
          activity_type: type,
          activity_title: activity.title,
        },
      });
    } catch (activityError) {
      console.warn('[ApplicationService] Failed to record application_submitted activity:', activityError);
    }

    // 6. 알림 생성은 DB 트리거에서 처리

    return { success: true };
  }

  /**
   * Get application detail (for the creator viewing applications)
   * Used in NotificationModal or Manage pages
   */
  async getApplicationDetail(
    activityId: string,
    applicantId: string,
    type: 'project' | 'collaboration'
  ): Promise<ApplicationDetail | null> {

    const table = type === 'project' ? 'project_applications' : 'collaboration_applications';
    const idField = type === 'project' ? 'project_id' : 'collaboration_id';

    // We need to join with profiles to get applicant info
    // And join with the activity table to get the title

    const { data, error } = await supabase
      .from(table)
      .select(`
        *,
        applicant:applicant_id (
          id,
          username,
          nickname,
          avatar_url,
          profile_artists(activity_field),
          profile_creatives(activity_field)
        )
      `)
      .eq(idField, activityId)
      .eq('applicant_id', applicantId)
      .single();

    if (error || !data) {
      console.error(`[ApplicationService] Detail fetch failed:`, error);
      return null;
    }

    // Fetch activity title separately if not easy to join dynamic table name
    const activityTable = type === 'project' ? 'projects' : 'collaborations';
    const { data: activity } = await supabase
      .from(activityTable)
      .select('title')
      .eq('id', activityId)
      .single();

    const applicant = data.applicant as any;
    // Determine job/activity field
    let job = '';
    if (applicant?.profile_artists?.length > 0) job = applicant.profile_artists[0].activity_field;
    else if (applicant?.profile_creatives?.length > 0) job = applicant.profile_creatives[0].activity_field;

    return {
      id: data.id,
      activityId: activityId,
      activityType: type,
      activityTitle: activity?.title || 'Unknown Activity',
      applicantId: data.applicant_id,
      applicant: {
        id: applicant?.id,
        name: applicant?.nickname || applicant?.username || 'Unknown',
        profileImageUrl: applicant?.avatar_url,
        job: job
      },
      status: data.status,
      coverLetter: data.cover_letter,
      portfolioLinks: data.portfolio_links || [],
      resumeUrl: data.resume_url,
      createdAt: data.created_at,

      // Optional fields
      budgetRange: data.budget_range,
      duration: data.duration,
      skills: data.skills,
      experienceYears: data.experience_years,
      availability: data.availability
    };
  }
}

export const applicationService = new ApplicationService();
