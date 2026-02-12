-- ============================================================
-- Migration: Add auto_deactivate_expired_notifications function
-- Description: Creates an RPC function to auto-deactivate
--              server notifications that have passed their ends_at date
-- ============================================================

-- Create the function to auto-deactivate expired notifications
CREATE OR REPLACE FUNCTION public.auto_deactivate_expired_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_expired_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Find all active notifications that have expired
    SELECT ARRAY_AGG(id)
    INTO v_expired_ids
    FROM server_notifications
    WHERE is_active = true
      AND ends_at IS NOT NULL
      AND ends_at < v_now;

    -- If no expired notifications found, return early
    IF v_expired_ids IS NULL OR array_length(v_expired_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'count', 0,
            'ids', '[]'::jsonb
        );
    END IF;

    -- Update all expired notifications to inactive
    UPDATE server_notifications
    SET is_active = false,
        updated_at = v_now
    WHERE id = ANY(v_expired_ids);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Return the result
    RETURN jsonb_build_object(
        'success', true,
        'count', v_count,
        'ids', to_jsonb(v_expired_ids)
    );
END;
$$;

-- Grant execute permission to authenticated users (backoffice admins)
GRANT EXECUTE ON FUNCTION public.auto_deactivate_expired_notifications() TO authenticated;

-- Also grant to anon for potential cron jobs
GRANT EXECUTE ON FUNCTION public.auto_deactivate_expired_notifications() TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_deactivate_expired_notifications() IS 
'Auto-deactivates server notifications that have passed their ends_at date. 
Returns a JSON object with success status, count of deactivated notifications, and their IDs.
Called from backoffice to clean up expired announcements, maintenance notices, etc.';
