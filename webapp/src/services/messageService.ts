import { supabase } from '../lib/supabase';
import type { TabItem } from '../components/common/TabBar';
import { getContentType } from '../utils/fileUtils';
import { getThumbnailUrl } from '../utils/signedUrl';
import { BlockService } from './blockService';
import { formatTime, getKstNowIsoWithOffset } from './message/timeUtils';

export interface Attachment {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: number;
}

export type ChatParticipantRole = 'owner' | 'admin' | 'member';

// 채팅방 참여자 권한 role (MessageRoom보다 먼저 정의)
export interface MessageRoom {
    id: string;
    title: string;
    type: 'project' | 'team' | 'partner' | 'collaboration'; // Tag type
    lastMessage: string;
    lastMessageTime: string;
    lastMessageTimestamp: string;
    unreadCount: number;
    participants: string[]; // Names of participants
    participantIds?: string[]; // User IDs of participants (for online status)
    avatarUrl?: string; // URL for the avatar image
    isOnline?: boolean; // For partner/individual chats (legacy, use Presence instead)
    isPinned?: boolean;
    pinnedAt?: string;
    isNotificationEnabled?: boolean;
    createdBy?: string; // Creator ID for delete permission
    noticeMessageId?: string | null; // 공지 메시지 ID
    myRole?: ChatParticipantRole; // 현재 사용자의 role
    projectId?: string; // 연결된 프로젝트 ID
    collaborationId?: string; // 연결된 협업 ID
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
    isMe: boolean;
    attachments?: Attachment[];
    type?: 'text' | 'system' | string; // 시스템 메시지 구분용
}

// 공지 메시지 타입
export interface NoticeMessage {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
}

// 참여자 정보
export interface ChatParticipant {
    userId: string;
    userName: string;
    userAvatar?: string;
    role: ChatParticipantRole;
    joinedAt: string;
    isOnline: boolean;
}

// 미디어 필터 타입
export type MediaFilterType = 'all' | 'image' | 'video' | 'file';

// 미디어 아이템
export interface MediaItem {
    messageId: string;
    type: 'image' | 'video' | 'file';
    url: string;
    name: string;
    size?: number;
    createdAt: string;
    senderId: string;
    senderName: string;
}

// 초대 상태
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';

// 채팅방 초대
export interface ChatRoomInvitation {
    id: string;
    roomId: string;
    roomTitle: string;
    inviterId: string;
    inviterName: string;
    inviterAvatar?: string;
    inviteeId: string;
    inviteeName: string;
    inviteeAvatar?: string;
    status: InvitationStatus;
    message?: string;
    sentAt: string;
    respondedAt?: string;
    expiresAt: string;
}

// Helper to get user details (simplified for now)
/**
 * 여러 사용자의 프로필을 배치로 조회 (N+1 쿼리 문제 해결)
 * 기존: N명 * 최대 5개 쿼리 = 최대 5N개 쿼리
 * 변경: 최대 5개 쿼리로 N명 정보 조회
 */
export interface UserDetails {
    name: string;
    avatar?: string;
}

export const getBatchUserDetails = async (userIds: string[]): Promise<Map<string, UserDetails>> => {
    const result = new Map<string, UserDetails>();
    if (userIds.length === 0) return result;

    const uniqueIds = [...new Set(userIds)];

    try {
        // 1. profiles 배치 조회
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, roles, nickname')
            .in('id', uniqueIds);

        if (!profiles) return result;

        // 프로필 맵 생성
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        // 2. 각 role별로 필요한 ID 추출
        const artistIds: string[] = [];
        const creativeIds: string[] = [];
        const brandIds: string[] = [];
        const fanIds: string[] = [];

        profiles.forEach(p => {
            const roles: string[] = Array.isArray(p.roles) ? p.roles as string[] : [];
            if (roles.includes('artist')) artistIds.push(p.id);
            if (roles.includes('creative')) creativeIds.push(p.id);
            if (roles.includes('brand')) brandIds.push(p.id);
            if (roles.includes('fan')) fanIds.push(p.id);
        });

        // 3. 프로필 타입별 배치 조회 (병렬 실행)
        const [artistsResult, creativesResult, brandsResult, fansResult] = await Promise.all([
            artistIds.length > 0
                ? supabase
                    .from('profile_artists')
                    .select('profile_id, artist_name, logo_image_url')
                    .in('profile_id', artistIds)
                    .eq('is_active', true)
                : Promise.resolve({ data: null }),
            creativeIds.length > 0
                ? supabase
                    .from('profile_creatives')
                    .select('profile_id, nickname, profile_image_url')
                    .in('profile_id', creativeIds)
                    .eq('is_active', true)
                : Promise.resolve({ data: null }),
            brandIds.length > 0
                ? supabase
                    .from('profile_brands')
                    .select('profile_id, brand_name, logo_image_url')
                    .in('profile_id', brandIds)
                    .eq('is_active', true)
                : Promise.resolve({ data: null }),
            fanIds.length > 0
                ? supabase
                    .from('profile_fans')
                    .select('profile_id, profile_image_url')
                    .in('profile_id', fanIds)
                    .eq('is_active', true)
                : Promise.resolve({ data: null }),
        ]);

        // 4. 각 타입별 맵 생성
        const artistMap = new Map(
            (artistsResult.data || []).map(a => [a.profile_id, { name: a.artist_name, avatar: a.logo_image_url }])
        );
        const creativeMap = new Map(
            (creativesResult.data || []).map(c => [c.profile_id, { name: c.nickname, avatar: c.profile_image_url }])
        );
        const brandMap = new Map(
            (brandsResult.data || []).map(b => [b.profile_id, { name: b.brand_name, avatar: b.logo_image_url }])
        );
        const fanMap = new Map(
            (fansResult.data || []).map(f => [f.profile_id, { avatar: f.profile_image_url }])
        );

        // 5. 우선순위에 따라 결과 맵 구성 (아티스트 > 크리에이티브 > 브랜드 > 팬)
        uniqueIds.forEach(userId => {
            const profile = profileMap.get(userId);
            const roles: string[] = Array.isArray(profile?.roles) ? profile!.roles as string[] : [];

            // 아티스트 우선
            if (roles.includes('artist') && artistMap.has(userId)) {
                result.set(userId, artistMap.get(userId)!);
                return;
            }

            // 크리에이티브
            if (roles.includes('creative') && creativeMap.has(userId)) {
                result.set(userId, creativeMap.get(userId)!);
                return;
            }

            // 브랜드
            if (roles.includes('brand') && brandMap.has(userId)) {
                result.set(userId, brandMap.get(userId)!);
                return;
            }

            // 팬
            if (roles.includes('fan') && fanMap.has(userId)) {
                const fanData = fanMap.get(userId)!;
                result.set(userId, { name: profile?.nickname || '팬', avatar: fanData.avatar });
                return;
            }

            // 기본값
            result.set(userId, { name: profile?.nickname || 'Unknown User', avatar: undefined });
        });

    } catch (error) {
        console.error('Error in getBatchUserDetails:', error);
        // 에러 시 모든 ID에 기본값 설정
        userIds.forEach(id => {
            if (!result.has(id)) {
                result.set(id, { name: 'Unknown User', avatar: undefined });
            }
        });
    }

    return result;
};

export const getUserDetails = async (userId: string): Promise<UserDetails | null> => {
    // 1) 기본 프로필 정보 (roles, nickname)
    const { data: profile } = await supabase
        .from('profiles')
        .select('roles, nickname')
        .eq('id', userId)
        .maybeSingle();

    const roles: string[] = Array.isArray(profile?.roles) ? profile!.roles as string[] : [];
    const hasBrand = roles.includes('brand');
    const hasArtist = roles.includes('artist');
    const hasCreative = roles.includes('creative');
    const hasFan = roles.includes('fan');

    try {
        // 2) 아티스트/크리에이티브 우선 사용 (요청사항)
        if (hasArtist) {
            const { data: artist } = await supabase
                .from('profile_artists')
                .select('artist_name, logo_image_url')
                .eq('profile_id', userId)
                .eq('is_active', true)
                .maybeSingle();
            if (artist) return { name: artist.artist_name, avatar: artist.logo_image_url };
        }

        if (hasCreative) {
            const { data: creative } = await supabase
                .from('profile_creatives')
                .select('nickname, profile_image_url')
                .eq('profile_id', userId)
                .eq('is_active', true)
                .maybeSingle();
            if (creative) return { name: creative.nickname, avatar: creative.profile_image_url };
        }

        // 3) 브랜드 / 팬 프로필 처리
        if (hasBrand) {
            const { data: brand } = await supabase
                .from('profile_brands')
                .select('brand_name, logo_image_url')
                .eq('profile_id', userId)
                .eq('is_active', true)
                .maybeSingle();
            if (brand) return { name: brand.brand_name, avatar: brand.logo_image_url };
        }

        if (hasFan) {
            const { data: fan } = await supabase
                .from('profile_fans')
                .select('profile_image_url')
                .eq('profile_id', userId)
                .eq('is_active', true)
                .maybeSingle();
            // Fan uses nickname from profiles table
            return { name: profile?.nickname || '팬', avatar: fan?.profile_image_url };
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
    }

    // 4) 어떤 활성 프로필도 없을 경우 profiles.nickname 사용
    return { name: profile?.nickname || 'Unknown User', avatar: undefined };
};

// 시스템 메시지 전송 헬퍼
const sendSystemMessage = async (roomId: string, content: string, senderId?: string) => {
    try {
        await messageService.sendMessage(roomId, content, [], senderId, 'system');
    } catch (error) {
        console.error('Failed to send system message:', error);
    }
};

const getDisplayName = async (userId: string): Promise<string> => {
    const details = await getUserDetails(userId);
    return details?.name || '사용자';
};

const removeInvitationsForUser = async (roomId: string, userId: string) => {
    try {
        await supabase
            .from('chat_room_invitations')
            .delete()
            .eq('room_id', roomId)
            .eq('invitee_id', userId);
    } catch (err) {
        console.error('Failed to cleanup invitations on leave:', err);
    }
};

export const messageService = {
    /**
     * 채팅방 목록 조회 (최적화 버전)
     * - JOIN 쿼리로 참가자 정보 한 번에 조회
     * - 배치 사용자 조회로 N+1 문제 해결
     * - currentUserId를 전달받아 getUser() 호출 절감
     */
    getRooms: async (filter: string = 'all', currentUserId?: string): Promise<MessageRoom[]> => {
        // currentUserId가 없으면 getUser() 호출 (fallback)
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            userId = user.id;
        }

        // 1. 내 참여 정보와 방 정보를 JOIN으로 한 번에 조회
        const { data: myParticipations, error } = await supabase
            .from('chat_participants')
            .select('room_id, last_read_at, is_pinned, pinned_at, is_notification_enabled')
            .eq('user_id', userId);

        if (error || !myParticipations) return [];

        const roomIds = myParticipations.map(p => p.room_id);
        if (roomIds.length === 0) return [];

        // 2. 방 정보 + 모든 참가자 정보를 JOIN으로 조회
        let query = supabase
            .from('chat_rooms')
            .select(`
                id, type, title, created_at, created_by,
                project_id, collaboration_id, room_image_url,
                chat_participants (user_id)
            `)
            .in('id', roomIds);

        if (filter !== 'all') {
            if (filter === 'team') {
                query = query.eq('type', 'team');
            } else if (filter === 'project_collaboration') {
                query = query.in('type', ['project', 'collaboration']);
            } else {
                query = query.eq('type', filter);
            }
        }

        const { data: rooms } = await query;
        if (!rooms) return [];

        // 2-1. 프로젝트/협업 커버 이미지 배치 조회
        const projectIds = rooms.filter(r => r.type === 'project' && r.project_id).map(r => r.project_id as string);
        const collaborationIds = rooms.filter(r => r.type === 'collaboration' && r.collaboration_id).map(r => r.collaboration_id as string);

        const [projectCovers, collaborationCovers] = await Promise.all([
            projectIds.length > 0
                ? supabase
                    .from('projects')
                    .select('id, cover_image_url')
                    .in('id', projectIds)
                : Promise.resolve({ data: [] as { id: string; cover_image_url?: string | null }[] }),
            collaborationIds.length > 0
                ? supabase
                    .from('collaborations')
                    .select('id, cover_image_url')
                    .in('id', collaborationIds)
                : Promise.resolve({ data: [] as { id: string; cover_image_url?: string | null }[] }),
        ]);

        const projectCoverMap = new Map((projectCovers.data || []).map(p => [p.id, p.cover_image_url]));
        const collaborationCoverMap = new Map((collaborationCovers.data || []).map(c => [c.id, c.cover_image_url]));

        // 3. 모든 방의 마지막 메시지를 배치로 조회
        const { data: allLastMessages } = await supabase
            .from('chat_messages')
            .select('room_id, content, created_at, attachments, sender_id')
            .in('room_id', rooms.map(r => r.id))
            .order('created_at', { ascending: false });

        // 방별 마지막 메시지 맵 생성
        const lastMessageMap = new Map<string, { content: string; created_at: string; attachments: Attachment[]; sender_id: string }>();
        allLastMessages?.forEach(msg => {
            if (!lastMessageMap.has(msg.room_id)) {
                lastMessageMap.set(msg.room_id, msg);
            }
        });

        // 4. 모든 참가자 ID 수집 및 배치 조회
        const allParticipantIds = new Set<string>();
        rooms.forEach(room => {
            const participants = room.chat_participants as { user_id: string }[] | null;
            participants?.forEach(p => {
                if (p.user_id !== userId) {
                    allParticipantIds.add(p.user_id);
                }
            });
        });

        const userDetailsMap = await getBatchUserDetails([...allParticipantIds]);

        // 5. unread count 배치 조회를 위한 데이터 준비
        // 각 방별 last_read_at 이후 메시지 수 계산 (클라이언트 측)
        const myPartMap = new Map(myParticipations.map(p => [p.room_id, p]));

        // 6. 방 정보 조합
        const enrichedRooms: MessageRoom[] = rooms.map((room) => {
            const lastMsg = lastMessageMap.get(room.id);
            const participants = room.chat_participants as { user_id: string }[] | null;
            const participantIds = participants?.map(p => p.user_id).filter(id => id !== userId) || [];

            // 참가자 이름/아바타 조회 (배치에서 가져옴)
            const participantDetails = participantIds
                .map(id => userDetailsMap.get(id))
                .filter((detail): detail is UserDetails => detail !== null && detail !== undefined);
            const participantNames = participantDetails.map(p => p.name);
            const derivedTitle = room.title || (participantNames.length > 0 ? participantNames.join(', ') : '대화방');

            // 마지막 메시지 미리보기
            let lastMessagePreview = '대화가 시작되었어요.';
            if (lastMsg) {
                if (lastMsg.content) {
                    lastMessagePreview = lastMsg.content;
                } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
                    const hasImage = lastMsg.attachments.some((a: Attachment) => a.type === 'image');
                    lastMessagePreview = hasImage ? '사진을 보냈어요.' : '파일을 보냈어요.';
                }
            }

            // unread count 계산 (allLastMessages에서 계산)
            const myPart = myPartMap.get(room.id);
            const lastRead = myPart?.last_read_at || new Date(0).toISOString();
            const unreadCount = allLastMessages?.filter(
                msg => msg.room_id === room.id &&
                    msg.created_at > lastRead &&
                    msg.sender_id !== userId
            ).length || 0;

            // 이미지 우선순위: 1. room_image_url, 2. 프로젝트/협업 cover, 3. 참여자 프로필
            const projectCover = room.type === 'project'
                ? projectCoverMap.get(room.project_id as string)
                : undefined;
            const collaborationCover = room.type === 'collaboration'
                ? collaborationCoverMap.get(room.collaboration_id as string)
                : undefined;
            const coverAvatar = projectCover || collaborationCover;

            // 아바타 URL 결정 후 썸네일로 변환 (48x48 표시에 96px 2x 레티나 대응)
            const rawAvatarUrl = (room as any).room_image_url || coverAvatar || participantDetails[0]?.avatar;
            const avatarUrl = getThumbnailUrl(rawAvatarUrl, 96, 96, 75) || undefined;

            return {
                id: room.id,
                title: derivedTitle,
                type: room.type as MessageRoom['type'],
                lastMessage: lastMessagePreview,
                lastMessageTime: lastMsg ? formatTime(lastMsg.created_at) : '',
                lastMessageTimestamp: lastMsg ? lastMsg.created_at : '',
                unreadCount,
                participants: participantNames,
                participantIds: participantIds,
                avatarUrl,
                isOnline: false,
                isPinned: myPart?.is_pinned || false,
                pinnedAt: myPart?.pinned_at || undefined,
                isNotificationEnabled: myPart?.is_notification_enabled ?? true,
                createdBy: room.created_by,
                projectId: room.project_id,
                collaborationId: room.collaboration_id,
            };
        });

        // 차단된 사용자와의 partner 타입 채팅방 필터링
        const { blockedUserIds, blockedByUserIds } = await BlockService.getAllBlockedIds(userId);
        const allBlockedIds = new Set([...blockedUserIds, ...blockedByUserIds]);

        const filteredRooms = enrichedRooms.filter(room => {
            // partner 타입 방만 필터링 (team/project/collaboration은 그룹채팅이므로 유지)
            if (room.type === 'partner' && room.participantIds && room.participantIds.length > 0) {
                // 참여자 중 차단된 사용자가 있으면 제외
                const hasBlockedParticipant = room.participantIds.some(id => allBlockedIds.has(id));
                return !hasBlockedParticipant;
            }
            return true;
        });

        // Sort by pinned status first, then by last message time
        return filteredRooms.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            // If both pinned, sort by pinnedAt (newest pin first)
            if (a.isPinned && b.isPinned) {
                if (!a.pinnedAt) return 1;
                if (!b.pinnedAt) return -1;
                return b.pinnedAt!.localeCompare(a.pinnedAt!);
            }

            // If neither pinned, sort by last message time
            if (!a.lastMessageTimestamp) return 1;
            if (!b.lastMessageTimestamp) return -1;
            return b.lastMessageTimestamp.localeCompare(a.lastMessageTimestamp);
        });
    },

    createRoom: async (
        type: 'team' | 'partner' | 'project' | 'collaboration',
        title: string,
        participantIds: string[],
        options?: {
            projectId?: string;
            collaborationId?: string;
            ownerId?: string;
            includeInitialSystemMessage?: boolean; // 기본값: true
            includeCreator?: boolean; // 기본값: true
        }
    ): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not logged in');

        const includeCreator = options?.includeCreator ?? true;
        if (!includeCreator && participantIds.length === 0) {
            throw new Error('참여자가 없어요. 최소 1명을 선택해주세요.');
        }

        // partner 타입 방 생성 시 양방향 차단 확인
        if (type === 'partner' && participantIds.length === 1) {
            const targetUserId = participantIds[0];
            const isBlocked = await BlockService.isBlockedBidirectional(user.id, targetUserId);
            if (isBlocked) {
                throw new Error('차단된 사용자와 대화를 시작할 수 없어요.');
            }
        }

        // DB 함수를 사용하여 채팅방 생성 + 참여자 추가 + 초기 메시지를 원자적으로 처리
        // SECURITY DEFINER 함수로 RLS를 우회하여 includeCreator=false 케이스도 처리 가능
        const ownerId = options?.ownerId ?? (includeCreator ? user.id : participantIds[0]);
        const allParticipants = Array.from(new Set([
            ...participantIds,
            ...(includeCreator ? [user.id] : []),
            ...(ownerId ? [ownerId] : []),
        ]));

        const shouldInsertInitialMessage = options?.includeInitialSystemMessage ?? true;

        const { data: roomId, error: rpcError } = await supabase.rpc('create_chat_room_with_participants', {
            p_type: type,
            p_title: title,
            p_created_by: user.id,
            p_participants: allParticipants,
            p_owner_id: ownerId,
            p_project_id: options?.projectId ?? null,
            p_collaboration_id: options?.collaborationId ?? null,
            p_include_initial_message: shouldInsertInitialMessage,
        });

        if (rpcError || !roomId) {
            console.error('Error creating room via RPC:', rpcError);
            return null;
        }

        return roomId;
    },

    /**
     * 채팅방 이름 수정 (Owner만 가능)
     */
    updateRoomTitle: async (roomId: string, title: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        // 권한 체크 (Owner 확인)
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .maybeSingle();

        if (participant?.role !== 'owner') {
            throw new Error('채팅방 이름을 수정할 권한이 없어요.');
        }

        const { error } = await supabase
            .from('chat_rooms')
            .update({ title })
            .eq('id', roomId);

        if (error) throw error;
    },

    /**
     * 채팅방 소유자 지정 (role 업데이트 + created_by 동기화)
     */
    setRoomOwner: async (roomId: string, ownerId: string, currentUserId?: string): Promise<void> => {
        let actorId = currentUserId;
        if (!actorId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            actorId = user.id;
        }

        // 1) owner 참여자 존재 여부 확인
        const { data: existingOwner } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', roomId)
            .eq('user_id', ownerId)
            .maybeSingle();

        // 2) owner 역할 부여 (존재하면 update, 없으면 insert)
        if (existingOwner) {
            const { error: updateError } = await supabase
                .from('chat_participants')
                .update({ role: 'owner' })
                .eq('room_id', roomId)
                .eq('user_id', ownerId);

            if (updateError) throw updateError;
        } else {
            // 참여자가 없는 경우 insert (createRoom에서 추가되었어야 하지만 안전장치)
            const { error: insertError } = await supabase
                .from('chat_participants')
                .insert({
                    room_id: roomId,
                    user_id: ownerId,
                    role: 'owner'
                });

            if (insertError) throw insertError;
        }

        // 3) 생성자 정보도 owner로 맞춤
        const { error: roomUpdateError } = await supabase
            .from('chat_rooms')
            .update({ created_by: ownerId })
            .eq('id', roomId);

        if (roomUpdateError) throw roomUpdateError;

        // 4) 요청자가 owner가 아닌 경우 member로 설정해 일관성 유지
        if (ownerId !== actorId) {
            const { error: actorUpdateError } = await supabase
                .from('chat_participants')
                .update({ role: 'member' })
                .eq('room_id', roomId)
                .eq('user_id', actorId);

            if (actorUpdateError) {
                // actor가 참여자가 아닌 경우는 무시 (이미 member일 수 있음)
                console.warn('[setRoomOwner] Failed to update actor role:', actorUpdateError);
            }
        }
    },

    /**
     * Get chat room ID for a specific project
     */
    getRoomByProjectId: async (projectId: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('project_id', projectId)
            // 프로젝트별로 여러 채팅방이 존재하더라도, 가장 최근 것 1개만 사용
            // 단일 객체 응답(maybeSingle)을 쓰려면 limit(1)이 반드시 필요함
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error getting room by project ID:', error);
            return null;
        }
        return data?.id || null;
    },

    /**
     * Get chat room ID for a specific collaboration
     */
    getRoomByCollaborationId: async (collaborationId: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('collaboration_id', collaborationId)
            .maybeSingle();

        if (error) {
            console.error('Error getting room by collaboration ID:', error);
            return null;
        }
        return data?.id || null;
    },

    /**
     * Add a participant to an existing chat room
     */
    addParticipantToRoom: async (roomId: string, userId: string): Promise<boolean> => {
        // Check if user is already in the room
        const { data: existing } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            // User is already in the room
            return true;
        }

        const { error } = await supabase
            .from('chat_participants')
            .insert({
                room_id: roomId,
                user_id: userId
            });

        if (error) {
            console.error('Error adding participant to room:', error);
            return false;
        }

        // 시스템 메시지 전송: 입장 알림
        try {
            const userName = await getDisplayName(userId);
            await sendSystemMessage(roomId, `${userName}님이 입장했어요.`, userId);
        } catch (err) {
            console.error('Failed to send system join message:', err);
        }

        return true;
    },

    getRoomById: async (id: string, currentUserId?: string): Promise<MessageRoom | undefined> => {
        const rooms = await messageService.getRooms('all', currentUserId);
        return rooms.find(r => r.id === id);
    },

    /**
     * 메시지 목록 조회 (최적화 버전)
     * - 발신자 정보를 배치로 조회하여 N+1 문제 해결
     * - currentUserId를 전달받아 getUser() 호출 절감
     */
    getMessages: async (roomId: string, currentUserId?: string): Promise<ChatMessage[]> => {
        // currentUserId가 없으면 getUser() 호출 (fallback)
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            userId = user.id;
        }

        const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('id, sender_id, content, created_at, attachments, type')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            throw messagesError;
        }

        if (!messages || messages.length === 0) return [];

        // 발신자 ID 추출 (본인 제외) 및 배치 조회
        const senderIds = [...new Set(
            messages
                .map(m => m.sender_id)
                .filter(id => id !== userId)
        )];

        const senderDetailsMap = await getBatchUserDetails(senderIds);

        // Map to ChatMessage interface (동기 처리)
        const mappedMessages: ChatMessage[] = messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            let senderName = '나';
            let senderAvatar: string | undefined = undefined;

            if (!isMe) {
                const details = senderDetailsMap.get(msg.sender_id);
                senderName = details?.name || '사용자';
                // 메시지 아바타 썸네일 (40px 표시에 80px 2x 레티나 대응)
                senderAvatar = getThumbnailUrl(details?.avatar, 80, 80, 75) || undefined;
            }

            return {
                id: msg.id,
                senderId: msg.sender_id,
                senderName,
                senderAvatar,
                content: msg.content,
                timestamp: formatTime(msg.created_at),
                isMe,
                attachments: msg.attachments || [],
                type: (msg as any).type || 'text'
            };
        });

        return mappedMessages;
    },

    sendMessage: async (
        roomId: string,
        content: string,
        attachments: Attachment[] = [],
        currentUserId?: string,
        type: 'text' | 'system' | string = 'text',
        mentionedUserIds?: string[]
    ): Promise<void> => {
        // currentUserId가 없으면 getUser() 호출 (fallback)
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        // 차단 확인: partner 타입 방에서 양방향 차단 검사
        if (type !== 'system') {
            const { data: room } = await supabase
                .from('chat_rooms')
                .select('type, chat_participants(user_id)')
                .eq('id', roomId)
                .single();

            if (room?.type === 'partner') {
                const participants = room.chat_participants as { user_id: string }[] | null;
                const otherParticipantId = participants?.find(p => p.user_id !== userId)?.user_id;

                if (otherParticipantId) {
                    const isBlocked = await BlockService.isBlockedBidirectional(userId, otherParticipantId);
                    if (isBlocked) {
                        throw new Error('차단된 사용자에게 메시지를 보낼 수 없어요.');
                    }
                }
            }
        }

        const createdAtKst = getKstNowIsoWithOffset();

        const { error } = await supabase
            .from('chat_messages')
            .insert({
                room_id: roomId,
                sender_id: userId,
                content,
                attachments,
                type,
                created_at: createdAtKst,
            });

        if (error) throw error;

        // 멘션된 사용자들에게 알림 전송
        if (mentionedUserIds && mentionedUserIds.length > 0) {
            await messageService.sendMentionNotifications(
                roomId,
                userId,
                mentionedUserIds,
                content
            );
        }
    },

    /**
     * 멘션 알림 전송
     */
    sendMentionNotifications: async (
        roomId: string,
        senderId: string,
        mentionedUserIds: string[],
        messageContent: string
    ): Promise<void> => {
        try {
            // 발신자 정보 조회
            const senderDetails = await getUserDetails(senderId);
            const senderName = senderDetails?.name || '사용자';
            const senderAvatar = senderDetails?.avatar;

            // 채팅방 정보 조회
            const { data: room } = await supabase
                .from('chat_rooms')
                .select('title')
                .eq('id', roomId)
                .single();

            const roomTitle = room?.title || '채팅방';

            // 멘션 내용 미리보기 (50자 제한) - 멘션 마크업 제거
            const cleanContent = messageContent.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
            const contentPreview = cleanContent.length > 50
                ? cleanContent.slice(0, 50) + '...'
                : cleanContent;

            // 각 멘션된 사용자에게 알림 전송 (자신 제외)
            const notifications = mentionedUserIds
                .filter(receiverId => receiverId !== senderId) // 자신 제외
                .map(receiverId => ({
                    receiver_id: receiverId,
                    type: 'mention',
                    title: '채팅방에서 멘션되었어요',
                    content: `${senderName}님이 "${roomTitle}"에서 회원님을 언급했어요: ${contentPreview}`,
                    related_id: roomId,
                    related_type: 'chat',
                    is_read: false,
                    metadata: {
                        sender_id: senderId,
                        sender_name: senderName,
                        sender_avatar: senderAvatar,
                        room_id: roomId,
                        room_title: roomTitle,
                        mention_type: 'chat_mention'
                    }
                }));

            if (notifications.length === 0) {
                console.log('No mention notifications to send (all recipients are self)');
                return;
            }

            const { error } = await supabase
                .from('user_notifications')
                .insert(notifications);

            if (error) {
                console.error('Failed to send mention notifications:', error);
            }
        } catch (error) {
            console.error('Error in sendMentionNotifications:', error);
        }
    },

    /**
     * 메시지 삭제 (취소 시 사용)
     * 본인이 보낸 메시지만 삭제 가능
     */
    deleteMessage: async (messageId: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId)
            .eq('sender_id', userId); // 본인 메시지만 삭제 가능

        if (error) throw error;
    },

    subscribeToRoom: (roomId: string, callback: (payload: { new: ChatMessage }) => void) => {
        return supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
                callback
            )
            .subscribe();
    },

    pinRoom: async (roomId: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        const { error } = await supabase
            .from('chat_participants')
            .update({ is_pinned: true, pinned_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    unpinRoom: async (roomId: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        const { error } = await supabase
            .from('chat_participants')
            .update({ is_pinned: false, pinned_at: null })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    toggleNotification: async (roomId: string, isEnabled: boolean, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        const { error } = await supabase
            .from('chat_participants')
            .update({ is_notification_enabled: isEnabled })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    markAsRead: async (roomId: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userId = user.id;
        }

        const { error } = await supabase
            .from('chat_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', userId);

        if (error) console.error('Error marking as read:', error);
    },

    uploadAttachment: async (file: File): Promise<Attachment | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Get Content-Type for the file
            const contentType = getContentType(file);

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file, {
                    contentType: contentType,
                });

            if (uploadError) {
                console.error('Error uploading file:', uploadError);
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            const type = file.type.startsWith('image/') ? 'image' : 'file';

            return {
                type,
                url: publicUrl,
                name: file.name,
                size: file.size
            };
        } catch (error) {
            console.error('Error in uploadAttachment:', error);
            return null;
        }
    },

    /**
     * Get the creator of a chat room
     * @returns The user ID of the room creator, or null if not found
     */
    getRoomCreator: async (roomId: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('created_by')
            .eq('id', roomId)
            .single();

        if (error) {
            console.error('Error getting room creator:', error);
            return null;
        }
        return data?.created_by || null;
    },

    /**
     * Leave a chat room
     * Removes the user from chat_participants but preserves chat history for other participants
     */
    leaveRoom: async (roomId: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        // 시스템 메시지 전송: 퇴장 알림 (재초대용 invitee 토큰 포함)
        try {
            const userName = await getDisplayName(userId);
            await sendSystemMessage(roomId, `${userName}님이 퇴장했어요.|invitee=${userId}`, userId);
        } catch (err) {
            console.error('Failed to send system leave message:', err);
        }

        // Remove user from chat_participants (메시지 후 삭제)
        const { error } = await supabase
            .from('chat_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error leaving room:', error);
            throw new Error(`채팅방 나가기에 실패했습니다: ${error.message}`);
        }

        // 초대 레코드 정리 (수락 후 남아있는 accepted/pending 등 제거)
        await removeInvitationsForUser(roomId, userId);
    },

    /**
     * Delete a chat room (only room creator can do this)
     * Deletes the room and all associated messages and participants
     */
    deleteRoom: async (roomId: string, currentUserId?: string): Promise<void> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not logged in');
            userId = user.id;
        }

        // Check if user is the creator
        const creatorId = await messageService.getRoomCreator(roomId);
        if (!creatorId || creatorId !== userId) {
            throw new Error('채팅방을 삭제할 권한이 없어요. 채팅방 생성자만 삭제할 수 있어요.');
        }

        // Delete messages first (foreign key constraint)
        const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('room_id', roomId);

        if (messagesError) {
            console.error('Error deleting messages:', messagesError);
            throw new Error(`채팅 메시지 삭제에 실패했어요: ${messagesError.message}`);
        }

        // Delete participants
        const { error: participantsError } = await supabase
            .from('chat_participants')
            .delete()
            .eq('room_id', roomId);

        if (participantsError) {
            console.error('Error deleting participants:', participantsError);
            throw new Error(`채팅방 참가자 삭제에 실패했어요: ${participantsError.message}`);
        }

        // Delete the room
        const { error: roomError } = await supabase
            .from('chat_rooms')
            .delete()
            .eq('id', roomId);

        if (roomError) {
            console.error('Error deleting room:', roomError);
            throw new Error(`채팅방 삭제에 실패했어요: ${roomError.message}`);
        }
    },

    /**
     * Check if the current user is the creator of the room
     */
    isRoomCreator: async (roomId: string, currentUserId?: string): Promise<boolean> => {
        let userId = currentUserId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;
            userId = user.id;
        }

        const creatorId = await messageService.getRoomCreator(roomId);
        return creatorId === userId;
    },

    getTabs: (): TabItem[] => [
        { key: 'all', label: '전체' },
        { key: 'project_collaboration', label: '프로젝트·협업' },
        { key: 'team', label: '팀' },
        { key: 'partner', label: '파트너' },
    ],

    // ========================================
    // 공지/설정 확장 API 메서드 (9개)
    // ========================================

    /**
     * 1. 공지 설정/해제
     */
    setRoomNotice: async (
        roomId: string,
        messageId: string | null,
        currentUserId: string
    ): Promise<void> => {
        // 권한 체크
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (!participant || !['owner', 'admin'].includes(participant.role)) {
            throw new Error('공지를 설정할 권한이 없어요.');
        }

        const { error } = await supabase
            .from('chat_rooms')
            .update({ notice_message_id: messageId })
            .eq('id', roomId);

        if (error) throw error;
    },

    /**
     * 2. 공지 메시지 조회
     */
    getRoomNotice: async (roomId: string): Promise<NoticeMessage | null> => {
        const { data: room } = await supabase
            .from('chat_rooms')
            .select('notice_message_id')
            .eq('id', roomId)
            .maybeSingle();

        if (!room?.notice_message_id) return null;

        const { data: message } = await supabase
            .from('chat_messages')
            .select('id, content, sender_id, created_at')
            .eq('id', room.notice_message_id)
            .maybeSingle();

        if (!message) return null;

        // sender 정보 조회
        const senderDetails = await getBatchUserDetails([message.sender_id]);

        return {
            id: message.id,
            content: message.content,
            senderId: message.sender_id,
            senderName: senderDetails.get(message.sender_id)?.name || 'Unknown',
            createdAt: message.created_at
        };
    },

    /**
     * 3. 참여자 목록 조회 (role 포함, 정렬: owner → admin → joined_at)
     */
    getRoomParticipants: async (
        roomId: string,
        _currentUserId: string  // 향후 권한 체크에 사용 가능
    ): Promise<ChatParticipant[]> => {
        const { data, error } = await supabase
            .from('chat_participants')
            .select('user_id, role, joined_at')
            .eq('room_id', roomId);

        if (error) throw error;
        if (!data) return [];

        // 사용자 세부 정보 배치 조회
        const userIds = data.map(p => p.user_id);
        const userDetails = await getBatchUserDetails(userIds);

        // presence 상태 조회
        const { isUserOnline } = await import('../stores/presenceStore');

        const participants: ChatParticipant[] = data.map(p => ({
            userId: p.user_id,
            userName: userDetails.get(p.user_id)?.name || 'Unknown',
            userAvatar: userDetails.get(p.user_id)?.avatar,
            role: p.role as ChatParticipantRole,
            joinedAt: p.joined_at,
            isOnline: isUserOnline(p.user_id)
        }));

        // 정렬: owner → admin → joined_at
        return participants.sort((a, b) => {
            const roleOrder: Record<ChatParticipantRole, number> = { owner: 0, admin: 1, member: 2 };
            if (a.role !== b.role) {
                return roleOrder[a.role] - roleOrder[b.role];
            }
            return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        });
    },

    /**
     * 4. 현재 사용자의 role 조회
     */
    getMyRole: async (roomId: string, currentUserId: string): Promise<ChatParticipantRole> => {
        const { data } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        return (data?.role as ChatParticipantRole) || 'member';
    },

    /**
     * 5. 참여자 초대 (admin+ 권한 필요) - 초대장 생성 방식
     * 상대방이 수락해야 참여자로 추가됨
     */
    inviteParticipants: async (
        roomId: string,
        userIds: string[],
        currentUserId: string,
        message?: string
    ): Promise<{ sent: number; alreadyInRoom: number; alreadyInvited: number }> => {
        // 권한 체크
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (!participant || !['owner', 'admin'].includes(participant.role)) {
            throw new Error('참여자를 초대할 권한이 없어요.');
        }

        // 이미 참여 중인 사용자 필터링
        const { data: existingParticipants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', roomId)
            .in('user_id', userIds);

        const participantIds = new Set(existingParticipants?.map(p => p.user_id) || []);

        // 이미 대기 중인 초대 필터링
        const { data: existingInvitations } = await supabase
            .from('chat_room_invitations')
            .select('invitee_id')
            .eq('room_id', roomId)
            .eq('status', 'pending')
            .in('invitee_id', userIds);

        const pendingInviteeIds = new Set(existingInvitations?.map(i => i.invitee_id) || []);

        // 새로 초대할 사용자
        const newInviteeIds = userIds.filter(
            id => !participantIds.has(id) && !pendingInviteeIds.has(id)
        );

        if (newInviteeIds.length === 0) {
            return {
                sent: 0,
                alreadyInRoom: participantIds.size,
                alreadyInvited: pendingInviteeIds.size
            };
        }

        // 기존 초대 레코드(모든 상태) 제거 후 새로 생성
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        try {
            await supabase
                .from('chat_room_invitations')
                .delete()
                .eq('room_id', roomId)
                .in('invitee_id', newInviteeIds);
        } catch (cleanupError) {
            console.error('Failed to cleanup previous invitations:', cleanupError);
        }

        // 초대장 생성
        const invitations = newInviteeIds.map(inviteeId => ({
            room_id: roomId,
            inviter_id: currentUserId,
            invitee_id: inviteeId,
            status: 'pending',
            message: message || null,
            expires_at: newExpiresAt // 7일 후 만료
        }));

        // 중복(pending/accepted/rejected) 존재 시 무시 (unique: room_id, invitee_id, status)
        const { error } = await supabase
            .from('chat_room_invitations')
            .insert(invitations);

        if (error) throw error;

        // 시스템 메시지 전송: 초대 알림
        try {
            const inviterName = await getDisplayName(currentUserId);
            const inviteeDetails = await getBatchUserDetails(newInviteeIds);
            for (const inviteeId of newInviteeIds) {
                const inviteeName = inviteeDetails.get(inviteeId)?.name || '사용자';
                await sendSystemMessage(roomId, `${inviterName}님이 ${inviteeName}님을 초대했어요.`, currentUserId);
            }
        } catch (err) {
            console.error('Failed to send system invite message:', err);
        }

        return {
            sent: newInviteeIds.length,
            alreadyInRoom: userIds.filter(id => participantIds.has(id)).length,
            alreadyInvited: userIds.filter(id => pendingInviteeIds.has(id)).length
        };
    },

    /**
     * 5-1. 단일 사용자 초대
     */
    sendInvitation: async (
        roomId: string,
        inviteeId: string,
        currentUserId: string,
        message?: string
    ): Promise<void> => {
        const result = await messageService.inviteParticipants(roomId, [inviteeId], currentUserId, message);
        if (result.sent === 0) {
            if (result.alreadyInRoom > 0) {
                throw new Error('이미 채팅방에 참여 중인 사용자입니다.');
            }
            if (result.alreadyInvited > 0) {
                throw new Error('이미 초대한 사용자입니다.');
            }
        }
    },

    /**
     * 5-2. 받은 초대 목록 조회 (대기 중인 초대)
     */
    getReceivedInvitations: async (
        currentUserId: string
    ): Promise<ChatRoomInvitation[]> => {
        const { data, error } = await supabase
            .from('chat_room_invitations')
            .select(`
                id,
                room_id,
                inviter_id,
                invitee_id,
                status,
                message,
                sent_at,
                responded_at,
                expires_at
            `)
            .eq('invitee_id', currentUserId)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('sent_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // 방 정보 조회
        const roomIds = [...new Set(data.map(i => i.room_id))];
        const { data: rooms } = await supabase
            .from('chat_rooms')
            .select('id, title')
            .in('id', roomIds);

        const roomMap = new Map(rooms?.map(r => [r.id, r.title]) || []);

        // 사용자 정보 조회
        const userIds = [...new Set([
            ...data.map(i => i.inviter_id),
            ...data.map(i => i.invitee_id)
        ])];
        const userDetails = await getBatchUserDetails(userIds);

        return data.map(inv => ({
            id: inv.id,
            roomId: inv.room_id,
            roomTitle: roomMap.get(inv.room_id) || '채팅방',
            inviterId: inv.inviter_id,
            inviterName: userDetails.get(inv.inviter_id)?.name || 'Unknown',
            inviterAvatar: userDetails.get(inv.inviter_id)?.avatar,
            inviteeId: inv.invitee_id,
            inviteeName: userDetails.get(inv.invitee_id)?.name || 'Unknown',
            inviteeAvatar: userDetails.get(inv.invitee_id)?.avatar,
            status: inv.status as InvitationStatus,
            message: inv.message || undefined,
            sentAt: inv.sent_at,
            respondedAt: inv.responded_at || undefined,
            expiresAt: inv.expires_at
        }));
    },

    /**
     * 5-3. 보낸 초대 목록 조회
     */
    getSentInvitations: async (
        roomId: string,
        currentUserId: string
    ): Promise<ChatRoomInvitation[]> => {
        // 권한 체크 (해당 방의 참여자인지)
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .single();

        if (!participant) {
            throw new Error('채팅방에 참여하고 있지 않아요.');
        }

        const { data, error } = await supabase
            .from('chat_room_invitations')
            .select(`
                id,
                room_id,
                inviter_id,
                invitee_id,
                status,
                message,
                sent_at,
                responded_at,
                expires_at
            `)
            .eq('room_id', roomId)
            .eq('status', 'pending')
            .order('sent_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // 방 정보 조회
        const { data: room } = await supabase
            .from('chat_rooms')
            .select('title')
            .eq('id', roomId)
            .single();

        // 사용자 정보 조회
        const userIds = [...new Set([
            ...data.map(i => i.inviter_id),
            ...data.map(i => i.invitee_id)
        ])];
        const userDetails = await getBatchUserDetails(userIds);

        return data.map(inv => ({
            id: inv.id,
            roomId: inv.room_id,
            roomTitle: room?.title || '채팅방',
            inviterId: inv.inviter_id,
            inviterName: userDetails.get(inv.inviter_id)?.name || 'Unknown',
            inviterAvatar: userDetails.get(inv.inviter_id)?.avatar,
            inviteeId: inv.invitee_id,
            inviteeName: userDetails.get(inv.invitee_id)?.name || 'Unknown',
            inviteeAvatar: userDetails.get(inv.invitee_id)?.avatar,
            status: inv.status as InvitationStatus,
            message: inv.message || undefined,
            sentAt: inv.sent_at,
            respondedAt: inv.responded_at || undefined,
            expiresAt: inv.expires_at
        }));
    },

    /**
     * 5-4. 초대 수락
     * 수락 시 초대자(inviter)의 채팅권이 차감됩니다.
     */
    acceptInvitation: async (
        invitationId: string,
        currentUserId: string
    ): Promise<string> => {
        // 초대 정보 조회 (inviter_id 포함)
        const { data: invitation, error: fetchError } = await supabase
            .from('chat_room_invitations')
            .select('room_id, inviter_id, invitee_id, status, expires_at')
            .eq('id', invitationId)
            .single();

        if (fetchError || !invitation) {
            throw new Error('초대를 찾을 수 없어요.');
        }

        if (invitation.invitee_id !== currentUserId) {
            throw new Error('본인의 초대만 수락할 수 있어요.');
        }

        if (invitation.status !== 'pending') {
            throw new Error('이미 처리된 초대입어요.');
        }

        if (new Date(invitation.expires_at) < new Date()) {
            throw new Error('만료된 초대입어요.');
        }

        // 이미 accepted 된 초대가 있으면 그대로 성공 처리하여 중복 충돌 회피
        const { data: existingAccepted } = await supabase
            .from('chat_room_invitations')
            .select('id')
            .eq('room_id', invitation.room_id)
            .eq('invitee_id', currentUserId)
            .eq('status', 'accepted')
            .maybeSingle();
        if (existingAccepted && existingAccepted.id !== invitationId) {
            return invitation.room_id;
        }

        // 채팅권 차감: 초대자(inviter)의 크레딧을 차감
        // shopService를 동적으로 import하여 순환 참조 방지
        // const { shopService } = await import('./shopService');
        // const creditUsed = await shopService.useChatCredit(invitation.inviter_id);
        // if (!creditUsed) {
        //     throw new Error('초대자의 채팅권이 부족하여 수락할 수 없어요.');
        // }

        // 트랜잭션: 초대 상태 업데이트 + 참여자 추가
        const { error: updateError } = await supabase
            .from('chat_room_invitations')
            .update({
                status: 'accepted',
                responded_at: new Date().toISOString()
            })
            .eq('id', invitationId);

        if (updateError) throw updateError;

        // 참여자로 추가
        const { error: insertError } = await supabase
            .from('chat_participants')
            .insert({
                room_id: invitation.room_id,
                user_id: currentUserId,
                role: 'member'
            });

        if (insertError) {
            // 롤백: 초대 상태 되돌리기
            await supabase
                .from('chat_room_invitations')
                .update({
                    status: 'pending',
                    responded_at: null
                })
                .eq('id', invitationId);
            throw insertError;
        }

        // 시스템 메시지 전송: 입장 알림
        try {
            const inviteeName = await getDisplayName(currentUserId);
            await sendSystemMessage(invitation.room_id, `${inviteeName}님이 입장했어요.`, currentUserId);
        } catch (err) {
            console.error('Failed to send system join message:', err);
        }

        return invitation.room_id;
    },

    /**
     * 5-5. 초대 거절
     */
    rejectInvitation: async (
        invitationId: string,
        currentUserId: string
    ): Promise<void> => {
        // 초대 정보 조회
        const { data: invitation, error: fetchError } = await supabase
            .from('chat_room_invitations')
            .select('invitee_id, status')
            .eq('id', invitationId)
            .single();

        if (fetchError || !invitation) {
            throw new Error('초대를 찾을 수 없어요.');
        }

        if (invitation.invitee_id !== currentUserId) {
            throw new Error('본인의 초대만 거절할 수 있어요.');
        }

        if (invitation.status !== 'pending') {
            throw new Error('이미 처리된 초대예요.');
        }

        const { error } = await supabase
            .from('chat_room_invitations')
            .update({
                status: 'rejected',
                responded_at: new Date().toISOString()
            })
            .eq('id', invitationId);

        if (error) throw error;
    },

    /**
     * 5-6. 초대 철회 (초대한 사람만 가능)
     */
    withdrawInvitation: async (
        invitationId: string,
        currentUserId: string
    ): Promise<void> => {
        // 초대 정보 조회
        const { data: invitation, error: fetchError } = await supabase
            .from('chat_room_invitations')
            .select('inviter_id, status')
            .eq('id', invitationId)
            .single();

        if (fetchError || !invitation) {
            throw new Error('초대를 찾을 수 없어요.');
        }

        if (invitation.inviter_id !== currentUserId) {
            throw new Error('본인이 보낸 초대만 철회할 수 있어요.');
        }

        if (invitation.status !== 'pending') {
            throw new Error('이미 처리된 초대예요.');
        }

        const { error } = await supabase
            .from('chat_room_invitations')
            .update({
                status: 'withdrawn',
                responded_at: new Date().toISOString()
            })
            .eq('id', invitationId);

        if (error) throw error;
    },

    /**
     * 5-7. 받은 초대 개수 조회
     */
    getReceivedInvitationCount: async (
        currentUserId: string
    ): Promise<number> => {
        const { count, error } = await supabase
            .from('chat_room_invitations')
            .select('id', { count: 'exact', head: true })
            .eq('invitee_id', currentUserId)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString());

        if (error) throw error;
        return count || 0;
    },

    /**
     * 6. 참여자 내보내기 (owner/admin만, owner는 내보낼 수 없음)
     */
    removeParticipant: async (
        roomId: string,
        targetUserId: string,
        currentUserId: string
    ): Promise<void> => {
        const { error } = await supabase.rpc('kick_chat_participant', {
            p_room_id: roomId,
            p_target_user_id: targetUserId,
        });

        if (error) throw error;

        // 시스템 메시지 전송: 내보내기 알림
        try {
            const [actorName, targetName] = await Promise.all([
                getDisplayName(currentUserId),
                getDisplayName(targetUserId),
            ]);
            await sendSystemMessage(roomId, `${actorName}님이 ${targetName}님을 내보냈어요.`, currentUserId);
        } catch (err) {
            console.error('Failed to send system kick message:', err);
        }

        // 초대 레코드 정리 (강퇴 대상)
        await removeInvitationsForUser(roomId, targetUserId);
    },

    /**
     * 7. 권한 부여/회수 (owner만 가능)
     */
    updateParticipantRole: async (
        roomId: string,
        targetUserId: string,
        newRole: 'admin' | 'member',
        currentUserId: string
    ): Promise<void> => {
        // owner 권한 체크
        const { data: currentPart } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .single();

        if (currentPart?.role !== 'owner') {
            throw new Error('권한을 변경할 수 있는 권한이 없어요.');
        }

        const { error } = await supabase
            .from('chat_participants')
            .update({ role: newRole })
            .eq('room_id', roomId)
            .eq('user_id', targetUserId);

        if (error) throw error;

        // 시스템 메시지 전송: 권한 변경 알림
        try {
            const [actorName, targetName] = await Promise.all([
                getDisplayName(currentUserId),
                getDisplayName(targetUserId),
            ]);
            const actionText = newRole === 'admin' ? '관리 권한을 부여했어요.' : '관리 권한을 해제했어요.';
            await sendSystemMessage(roomId, `${actorName}님이 ${targetName}님에게 ${actionText}`, currentUserId);
        } catch (err) {
            console.error('Failed to send system role change message:', err);
        }
    },

    /**
     * 8. 방 나가기 (owner인 경우 handover 필수)
     */
    leaveRoomWithHandover: async (
        roomId: string,
        currentUserId: string,
        handoverToUserId?: string
    ): Promise<void> => {
        const { data: currentPart } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .single();

        // owner가 나가는 경우
        if (currentPart?.role === 'owner') {
            // 다른 관리자 확인
            const { data: admins } = await supabase
                .from('chat_participants')
                .select('user_id, role')
                .eq('room_id', roomId)
                .in('role', ['owner', 'admin'])
                .neq('user_id', currentUserId);

            if (!admins || admins.length === 0) {
                if (!handoverToUserId) {
                    throw new Error('방장 권한을 넘겨받을 사용자를 선택해주세요.');
                }

                // handover 대상을 owner로 승격
                await supabase
                    .from('chat_participants')
                    .update({ role: 'owner' })
                    .eq('room_id', roomId)
                    .eq('user_id', handoverToUserId);
            } else if (handoverToUserId) {
                // 명시적으로 지정한 경우 해당 사용자를 owner로
                await supabase
                    .from('chat_participants')
                    .update({ role: 'owner' })
                    .eq('room_id', roomId)
                    .eq('user_id', handoverToUserId);
            } else {
                // admin 중 첫 번째를 owner로 자동 승격
                await supabase
                    .from('chat_participants')
                    .update({ role: 'owner' })
                    .eq('room_id', roomId)
                    .eq('user_id', admins[0].user_id);
            }

            // created_by도 업데이트
            const newOwnerId = handoverToUserId || (admins && admins.length > 0 ? admins[0].user_id : null);
            if (newOwnerId) {
                await supabase
                    .from('chat_rooms')
                    .update({ created_by: newOwnerId })
                    .eq('id', roomId);
            }
        }

        // 시스템 메시지 전송: 퇴장 알림 (handover 포함, 재초대 토큰)
        try {
            const userName = await getDisplayName(currentUserId);
            await sendSystemMessage(roomId, `${userName}님이 퇴장했어요.|invitee=${currentUserId}`, currentUserId);
        } catch (err) {
            console.error('Failed to send system leave message (handover):', err);
        }

        // 참여자에서 제거 (메시지 후 삭제)
        const { error } = await supabase
            .from('chat_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', currentUserId);

        if (error) throw error;

        // 초대 레코드 정리
        await removeInvitationsForUser(roomId, currentUserId);
    },

    /**
     * 9. 미디어 목록 조회 (페이지네이션)
     */
    getRoomMedia: async (
        roomId: string,
        filterType: MediaFilterType = 'all',
        limit: number = 5,
        cursor?: string
    ): Promise<{ items: MediaItem[], nextCursor?: string }> => {
        let query = supabase
            .from('chat_messages')
            .select('id, attachments, created_at, sender_id')
            .eq('room_id', roomId)
            .not('attachments', 'is', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt('created_at', cursor);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data) return { items: [] };

        const items: MediaItem[] = [];
        const senderIds = new Set<string>();

        for (const msg of data) {
            const attachments = msg.attachments as Attachment[];
            if (!attachments || attachments.length === 0) continue;

            for (const att of attachments) {
                // 타입 필터링
                if (filterType !== 'all') {
                    if (filterType === 'image' && att.type !== 'image') continue;
                    if (filterType === 'video' && att.type !== 'file') continue; // video는 file 타입으로 저장됨
                    if (filterType === 'file' && att.type !== 'file') continue;
                }

                items.push({
                    messageId: msg.id,
                    type: att.type === 'image' ? 'image' : 'file',
                    url: att.url,
                    name: att.name,
                    size: att.size,
                    createdAt: msg.created_at,
                    senderId: msg.sender_id,
                    senderName: '' // 나중에 채움
                });

                senderIds.add(msg.sender_id);
            }
        }

        // sender 이름 배치 조회
        if (senderIds.size > 0) {
            const senderDetails = await getBatchUserDetails(Array.from(senderIds));
            items.forEach(item => {
                item.senderName = senderDetails.get(item.senderId)?.name || 'Unknown';
            });
        }

        const nextCursor = data.length === limit ? data[data.length - 1].created_at : undefined;

        return { items, nextCursor };
    },

    /**
     * 채팅방 이미지 업로드
     * owner/admin만 업로드 가능
     */
    uploadRoomImage: async (roomId: string, file: File, currentUserId: string): Promise<string> => {
        // 권한 체크
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (!participant || !['owner', 'admin'].includes(participant.role)) {
            throw new Error('채팅방 이미지를 변경할 권한이 없어요. (owner/admin만 가능)');
        }

        // 파일 검증
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('이미지 크기는 5MB 이하여야 해요.');
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('JPG, PNG, WebP 형식만 지원돼요.');
        }

        // 기존 이미지 URL 조회 (삭제용)
        const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('room_image_url')
            .eq('id', roomId)
            .maybeSingle();

        const existingImageUrl = existingRoom?.room_image_url;

        // 파일 업로드
        const fileExt = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const fileName = `${roomId}/${timestamp}-${random}.${fileExt}`;

        const contentType = getContentType(file);

        const { error: uploadError } = await supabase.storage
            .from('chatroom_images')
            .upload(fileName, file, {
                contentType: contentType,
                upsert: false
            });

        if (uploadError) {
            console.error('Error uploading room image:', uploadError);
            throw new Error('이미지 업로드에 실패했어요. 다시 시도해주세요.');
        }

        // Public URL 가져오기
        const { data: { publicUrl } } = supabase.storage
            .from('chatroom_images')
            .getPublicUrl(fileName);

        // DB 업데이트
        const { error: updateError } = await supabase
            .from('chat_rooms')
            .update({ room_image_url: publicUrl })
            .eq('id', roomId);

        if (updateError) {
            // DB 업데이트 실패 시 업로드한 파일 삭제
            await supabase.storage
                .from('chatroom_images')
                .remove([fileName]);
            throw new Error('이미지 정보 저장에 실패했어요. 다시 시도해주세요.');
        }

        // 기존 이미지 삭제 (chatroom_images 버킷에 있는 경우만)
        if (existingImageUrl && existingImageUrl.includes('/chatroom_images/')) {
            try {
                // URL에서 파일 경로 추출
                const urlParts = existingImageUrl.split('/chatroom_images/');
                if (urlParts.length > 1) {
                    const oldFilePath = urlParts[1].split('?')[0]; // 쿼리 파라미터 제거
                    await supabase.storage
                        .from('chatroom_images')
                        .remove([oldFilePath]);
                }
            } catch (deleteError) {
                console.error('Error deleting old image:', deleteError);
                // 기존 이미지 삭제 실패는 치명적이지 않음
            }
        }

        return publicUrl;
    },

    /**
     * 채팅방 이미지 삭제
     * owner/admin만 삭제 가능
     */
    deleteRoomImage: async (roomId: string, currentUserId: string): Promise<void> => {
        // 권한 체크
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (!participant || !['owner', 'admin'].includes(participant.role)) {
            throw new Error('채팅방 이미지를 삭제할 권한이 없어요. (owner/admin만 가능)');
        }

        // 기존 이미지 URL 조회
        const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('room_image_url')
            .eq('id', roomId)
            .maybeSingle();

        const existingImageUrl = existingRoom?.room_image_url;

        // Storage에서 이미지 삭제 (chatroom_images 버킷에 있는 경우만)
        if (existingImageUrl && existingImageUrl.includes('/chatroom_images/')) {
            try {
                const urlParts = existingImageUrl.split('/chatroom_images/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1].split('?')[0];
                    await supabase.storage
                        .from('chatroom_images')
                        .remove([filePath]);
                }
            } catch (deleteError) {
                console.error('Error deleting image from storage:', deleteError);
                // Storage 삭제 실패는 치명적이지 않음
            }
        }

        // DB에서 room_image_url을 NULL로 업데이트
        const { error: updateError } = await supabase
            .from('chat_rooms')
            .update({ room_image_url: null })
            .eq('id', roomId);

        if (updateError) {
            throw new Error('이미지 삭제에 실패했어요. 다시 시도해주세요.');
        }
    },

    /**
     * 미디어 파일 삭제
     * owner/admin만 삭제 가능
     */
    deleteMediaFiles: async (
        roomId: string,
        items: Array<{ messageId: string; url: string }>,
        currentUserId: string
    ): Promise<void> => {
        // 권한 체크
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (!participant || !['owner', 'admin'].includes(participant.role)) {
            throw new Error('미디어를 삭제할 권한이 없어요. (owner/admin만 가능)');
        }

        // 각 아이템 삭제 처리
        for (const item of items) {
            try {
                // 1. 메시지 조회
                const { data: message, error: fetchError } = await supabase
                    .from('chat_messages')
                    .select('attachments')
                    .eq('id', item.messageId)
                    .maybeSingle();

                if (fetchError || !message) {
                    console.error(`Message not found: ${item.messageId}`);
                    continue;
                }

                const attachments = message.attachments as Attachment[];
                if (!attachments || attachments.length === 0) continue;

                // 2. 해당 URL의 attachment 제거
                const updatedAttachments = attachments.filter(att => att.url !== item.url);

                // 3. Storage에서 파일 삭제 (chat_attachments 버킷에 있는 경우)
                if (item.url.includes('/chat_attachments/')) {
                    try {
                        const urlParts = item.url.split('/chat_attachments/');
                        if (urlParts.length > 1) {
                            const filePath = urlParts[1].split('?')[0]; // 쿼리 파라미터 제거
                            await supabase.storage
                                .from('chat_attachments')
                                .remove([filePath]);
                        }
                    } catch (storageError) {
                        console.error('Error deleting file from storage:', storageError);
                        // Storage 삭제 실패는 치명적이지 않음
                    }
                }

                // 4. DB 업데이트 또는 메시지 삭제
                if (updatedAttachments.length === 0) {
                    // 모든 attachment가 삭제된 경우 메시지 삭제
                    const { error: deleteError } = await supabase
                        .from('chat_messages')
                        .delete()
                        .eq('id', item.messageId);

                    if (deleteError) {
                        console.error(`Error deleting message ${item.messageId}:`, deleteError);
                    }
                } else {
                    // 일부 attachment만 삭제된 경우 업데이트
                    const { error: updateError } = await supabase
                        .from('chat_messages')
                        .update({ attachments: updatedAttachments })
                        .eq('id', item.messageId);

                    if (updateError) {
                        console.error(`Error updating message ${item.messageId}:`, updateError);
                    }
                }
            } catch (error) {
                console.error(`Error processing item ${item.messageId}:`, error);
                // 개별 아이템 삭제 실패 시 다음 아이템 계속 처리
            }
        }
    },

    /**
     * 10. 프로젝트/협업 팀 정보 조회 (초대 시 사용)
     */
    getProjectTeamInfo: async (
        projectId?: string,
        collaborationId?: string
    ): Promise<{ id: string; name: string; avatar?: string }[]> => {
        if (projectId) {
            const { data } = await supabase
                .from('project_members')
                .select('user_id')
                .eq('project_id', projectId)
                .eq('status', 'active');

            if (!data) return [];

            const userIds = data.map(m => m.user_id);
            const userDetails = await getBatchUserDetails(userIds);

            return userIds.map(id => ({
                id,
                name: userDetails.get(id)?.name || 'Unknown',
                avatar: userDetails.get(id)?.avatar
            }));
        } else if (collaborationId) {
            const { data } = await supabase
                .from('collaboration_members')
                .select('user_id')
                .eq('collaboration_id', collaborationId)
                .eq('status', 'active');

            if (!data) return [];

            const userIds = data.map(m => m.user_id);
            const userDetails = await getBatchUserDetails(userIds);

            return userIds.map(id => ({
                id,
                name: userDetails.get(id)?.name || 'Unknown',
                avatar: userDetails.get(id)?.avatar
            }));
        }

        return [];
    }
};
