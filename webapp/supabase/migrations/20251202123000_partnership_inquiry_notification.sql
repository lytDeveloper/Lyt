-- Add partnership_inquiry to allowed notification types if not already present
-- Note: UserNotificationType enum in typescript matches this constraint

-- Create function to handle partnership inquiry notifications
CREATE OR REPLACE FUNCTION public.handle_new_partnership_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    sender_name text;
    sender_avatar text;
    company_name text;
BEGIN
    -- Get sender profile info
    SELECT 
        CASE 
            WHEN p.nickname IS NOT NULL AND p.nickname != '' THEN p.nickname 
            WHEN u.raw_user_meta_data->>'name' IS NOT NULL THEN u.raw_user_meta_data->>'name'
            ELSE '알 수 없는 사용자'
        END,
        p.avatar_url
    INTO sender_name, sender_avatar
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE p.id = NEW.sender_id;

    -- Use provided company name or fall back to sender name
    company_name := COALESCE(NEW.company_name, sender_name);

    -- Create notification
    INSERT INTO public.user_notifications (
        receiver_id,
        type,
        title,
        content,
        related_id,
        related_type,
        metadata,
        is_read,
        created_at
    ) VALUES (
        NEW.receiver_id,
        'partnership_inquiry', -- New type
        '새로운 파트너십 문의',
        company_name || ' 님으로부터 파트너십 문의가 도착했어요.',
        NEW.id,
        'partnership_inquiry',
        jsonb_build_object(
            'sender_id', NEW.sender_id,
            'sender_name', sender_name,
            'sender_avatar', sender_avatar,
            'project_type', NEW.project_type
        ),
        false,
        now()
    );

    RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists to avoid duplication error
DROP TRIGGER IF EXISTS on_partnership_inquiry_created ON public.partnership_inquiries;

-- Create trigger
CREATE TRIGGER on_partnership_inquiry_created
    AFTER INSERT ON public.partnership_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_partnership_inquiry();

-- Add RLS policy for partnership_inquiries if not already present (just in case)
-- Allow authenticated users to insert inquiries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'partnership_inquiries' AND policyname = 'Users can insert partnership inquiries'
    ) THEN
        CREATE POLICY "Users can insert partnership inquiries" ON public.partnership_inquiries
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = sender_id);
    END IF;
END
$$;

-- Allow users to view inquiries they sent or received
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'partnership_inquiries' AND policyname = 'Users can view their own inquiries'
    ) THEN
        CREATE POLICY "Users can view their own inquiries" ON public.partnership_inquiries
        FOR SELECT
        TO authenticated
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;
END
$$;

