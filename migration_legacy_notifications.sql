-- ============================================================================
-- BridgeApp Legacy Data Migration (Phase 3.5)
-- Migrate existing data from source tables to 'user_notifications'
-- ============================================================================

-- 1. Migrate Project Proposals
INSERT INTO user_notifications (
    receiver_id, type, title, content, related_id, related_type, is_read, created_at, metadata
)
SELECT
    pp.receiver_id,
    'proposal',
    '새로운 프로젝트 제안',
    sender.nickname || '님이 "' || p.title || '" 프로젝트에 제안을 보냈습니다.',
    pp.project_id,
    'project',
    pp.is_read,
    pp.created_at,
    jsonb_build_object(
        'proposal_id', pp.id,
        'sender_id', pp.sender_id,
        'sender_name', sender.nickname
    )
FROM project_proposals pp
JOIN projects p ON pp.project_id = p.id
JOIN profiles sender ON pp.sender_id = sender.id
-- Avoid duplicates just in case triggers were active during development or partial run
WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications un 
    WHERE un.type = 'proposal' AND un.related_id = pp.project_id AND un.receiver_id = pp.receiver_id
);

-- 2. Migrate Collaboration Invitations
INSERT INTO user_notifications (
    receiver_id, type, title, content, related_id, related_type, is_read, created_at, metadata
)
SELECT
    ci.invitee_id,
    'invitation',
    '새로운 협업 초대',
    inviter.nickname || '님이 "' || c.title || '" 협업에 초대했습니다.',
    ci.collaboration_id,
    'collaboration',
    ci.is_read,
    ci.created_at,
    jsonb_build_object(
        'invitation_id', ci.id,
        'sender_id', ci.inviter_id,
        'sender_name', inviter.nickname
    )
FROM collaboration_invitations ci
JOIN collaborations c ON ci.collaboration_id = c.id
JOIN profiles inviter ON ci.inviter_id = inviter.id
WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications un 
    WHERE un.type = 'invitation' AND un.related_id = ci.collaboration_id AND un.receiver_id = ci.invitee_id
);

-- 3. Migrate Project Applications
INSERT INTO user_notifications (
    receiver_id, type, title, content, related_id, related_type, is_read, created_at, metadata
)
SELECT
    p.created_by, -- Project Owner is the receiver
    'application',
    '새로운 프로젝트 지원',
    applicant.nickname || '님이 "' || p.title || '" 프로젝트에 지원했습니다.',
    pa.project_id,
    'project',
    pa.is_read,
    pa.created_at,
    jsonb_build_object(
        'application_id', pa.id,
        'sender_id', pa.applicant_id,
        'sender_name', applicant.nickname
    )
FROM project_applications pa
JOIN projects p ON pa.project_id = p.id
JOIN profiles applicant ON pa.applicant_id = applicant.id
WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications un 
    WHERE un.type = 'application' 
    AND un.related_id = pa.project_id 
    AND un.receiver_id = p.created_by 
    AND (un.metadata->>'application_id')::uuid = pa.id
);

-- 4. Migrate Collaboration Applications
INSERT INTO user_notifications (
    receiver_id, type, title, content, related_id, related_type, is_read, created_at, metadata
)
SELECT
    c.created_by, -- Collaboration Owner is the receiver
    'application',
    '새로운 협업 지원',
    applicant.nickname || '님이 "' || c.title || '" 협업에 지원했습니다.',
    ca.collaboration_id,
    'collaboration',
    ca.is_read,
    ca.created_at,
    jsonb_build_object(
        'application_id', ca.id,
        'sender_id', ca.applicant_id,
        'sender_name', applicant.nickname
    )
FROM collaboration_applications ca
JOIN collaborations c ON ca.collaboration_id = c.id
JOIN profiles applicant ON ca.applicant_id = applicant.id
WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications un 
    WHERE un.type = 'application' 
    AND un.related_id = ca.collaboration_id 
    AND un.receiver_id = c.created_by 
    AND (un.metadata->>'application_id')::uuid = ca.id
);

-- 5. Migrate Chat Messages (Last 30 days only, to prevent flooding)
-- Logic: Find participants of the room, create notification for everyone except sender
-- NOTE: This is heavy if chat volume is high.
-- Simplified approach: Only migrate UNREAD messages? No, better to have history.
-- But 'is_read' in chat is per room (last_read_at), not per message.
-- Strategy: 
-- 1. Select messages from last 30 days.
-- 2. Join with chat_participants to find receivers.
-- 3. Calculate is_read based on (message.created_at <= participant.last_read_at).

INSERT INTO user_notifications (
    receiver_id, type, title, content, related_id, related_type, is_read, created_at, metadata
)
SELECT
    cp.user_id,
    'message',
    COALESCE(r.title, '채팅방'),
    sender.nickname || ': ' || substring(m.content from 1 for 50),
    m.room_id,
    'chat',
    (m.created_at <= cp.last_read_at), -- is_read calculation
    m.created_at,
    jsonb_build_object(
        'message_id', m.id,
        'sender_id', m.sender_id,
        'sender_name', sender.nickname
    )
FROM chat_messages m
JOIN chat_rooms r ON m.room_id = r.id
JOIN chat_participants cp ON m.room_id = cp.room_id
JOIN profiles sender ON m.sender_id = sender.id
WHERE 
    m.sender_id != cp.user_id -- Don't notify sender
    AND m.created_at > (now() - interval '30 days') -- Only recent messages
    AND NOT EXISTS (
        SELECT 1 FROM user_notifications un 
        WHERE un.type = 'message' 
        AND un.related_id = m.room_id 
        AND un.receiver_id = cp.user_id
        AND (un.metadata->>'message_id')::uuid = m.id
    );

