import { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Button, Avatar, TextField, Paper, Chip, Modal, useTheme } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import type { UserNotification, UserNotificationType } from '../../types/userNotification';
import { notificationActionService } from '../../services/notificationActionService';
import { useMarkNotificationAsRead } from '../../hooks/useNotifications';
import ActionSuccessModal from './ActionSuccessModal';
import { formatRelativeTime } from '../../utils/dateHelper';
import PartnerDetailContent from '../explore/PartnerDetailContent';
import { getPartnerById, type Partner } from '../../services/partnerService';
import { messageService } from '../../services/messageService';
import { getProfileDisplay } from '../../services/profileDisplayService';
import { buildNotificationDescription } from '../../utils/notificationHelper';
import { useSignedImage } from '../../hooks/useSignedImage';

interface InAppNotificationBannerProps {
  notification: UserNotification | null;
  onClose: () => void;
  onDismiss: () => void; // Called when manually dismissed or timeout
}

export default function InAppNotificationBanner({ notification, onClose, onDismiss }: InAppNotificationBannerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const markAsRead = useMarkNotificationAsRead();
  const theme = useTheme();
  const [replyText, setReplyText] = useState('');
  const [isInteracting, setIsInteracting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [isLoadingPartner, setIsLoadingPartner] = useState(false);
  const [displayName, setDisplayName] = useState(notification?.senderName);
  const [displayAvatar, setDisplayAvatar] = useState(notification?.senderAvatar);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [descriptionText, setDescriptionText] = useState(notification?.description || '');
  const [roomTitle, setRoomTitle] = useState<string | undefined>(
    notification?.metadata?.chat_room_name ||
    notification?.metadata?.room_title ||
    notification?.activityTitle
  );
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissDir, setDismissDir] = useState<1 | -1>(1);
  const timerRef = useRef<number | null>(null);
  const swipeThreshold = 80;

  // Auto-dismiss timer logic
  useEffect(() => {
    if (!notification) return;

    const startTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isInteracting) {
          onDismiss();
        }
      }, 5000); // 5 seconds
    };

    if (!isInteracting) {
      startTimer();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification, isInteracting, onDismiss]);

  // 초기화
  useEffect(() => {
    setDescriptionText(notification?.description || '');
    setRoomTitle(
      notification?.metadata?.chat_room_name ||
      notification?.metadata?.room_title ||
      notification?.activityTitle
    );
    setCoverImage(undefined);
    setIsDismissing(false);
    setDismissDir(1);
  }, [notification]);

  // 알림 타입별 표시 정보 설정
  useEffect(() => {
    if (!notification) return;

    setDescriptionText(notification.description || '');

    // talk_request 관련 알림: metadata에서 정보 가져오기
    if (notification.type === 'talk_request') {
      // 새 대화 요청: sender 정보 사용
      const senderName = notification.metadata?.sender_name as string;
      const senderAvatar = notification.metadata?.sender_avatar as string;
      if (senderName) setDisplayName(senderName);
      if (senderAvatar) setDisplayAvatar(senderAvatar);
      if (senderName || senderAvatar) return;
    }

    if (notification.type === 'talk_request_accepted' || notification.type === 'talk_request_rejected') {
      // 대화 요청 수락/거절: receiver(응답자) 정보 사용
      const receiverName = notification.metadata?.receiver_name as string;
      const receiverAvatar = notification.metadata?.receiver_avatar as string;
      if (receiverName) setDisplayName(receiverName);
      if (receiverAvatar) setDisplayAvatar(receiverAvatar);
      if (receiverName || receiverAvatar) return;
    }

    // 초대 알림: 초대 응답(수락/거절)인지 새 초대인지 구분
    if (notification.type === 'invitation') {
      const action = notification.metadata?.action as string;
      const coverImageUrl = notification.metadata?.cover_image_url as string;
      if (coverImageUrl) setCoverImage(coverImageUrl);

      if (action === 'accepted' || action === 'rejected') {
        // 초대 응답 알림: receiver(응답자) 정보 사용
        const receiverName = notification.metadata?.receiver_name as string;
        const receiverAvatar = notification.metadata?.receiver_avatar as string;
        if (receiverName) setDisplayName(receiverName);
        if (receiverAvatar) setDisplayAvatar(receiverAvatar);
        if (receiverName || receiverAvatar) return;
      }
      // 새 초대 알림: metadata.sender_name이 잘못될 수 있으므로 (profiles.nickname이 저장됨)
      // return 없이 계속 진행하여 loadDisplayInfo에서 활성 프로필 조회
    }

    // 지원/철회 알림: 커버 이미지 사용 안 함, 발신자(지원자) 프로필 사진만 사용
    // sender 정보는 loadDisplayInfo에서 조회
    if (notification.type === 'application' || notification.type === 'withdrawal') {
      // 커버 이미지 설정하지 않음
      // metadata.sender_name이 잘못될 수 있으므로 return 없이 loadDisplayInfo에서 조회
    }

    // 기본값 설정
    setDisplayName(notification.senderName);
    setDisplayAvatar(notification.senderAvatar);

    const senderId = notification.senderId || notification.relatedId;
    if (!senderId) return;

    // 새 초대/지원 알림은 항상 활성 프로필에서 조회 (metadata.sender_name이 잘못될 수 있음)
    const isNewInvitationOrApplication =
      (notification.type === 'invitation' && notification.metadata?.action !== 'accepted' && notification.metadata?.action !== 'rejected') ||
      notification.type === 'application';

    const needsLookup =
      !notification.senderName ||
      !notification.senderAvatar ||
      notification.type === 'follow' ||
      notification.type === 'like' ||
      isNewInvitationOrApplication;

    if (!needsLookup) return;

    const loadDisplayInfo = async () => {
      try {
        setIsLoadingPartner(true);

        // profileDisplayService를 사용하여 활성 프로필 조회 (brand/artist/creative/fan 모두 지원)
        const display = await getProfileDisplay(senderId);

        if (display) {
          setDisplayName(display.name);
          setDisplayAvatar(display.avatar);

          // 초대/지원 알림의 경우 동적으로 description 생성
          if (isNewInvitationOrApplication && notification) {
            const action = notification.metadata?.action as string | undefined;
            // 협업 지원: collaboration_title, 프로젝트 지원: project_title, 초대: target_title
            const targetTitle =
              (notification.metadata?.collaboration_title as string | undefined) ||
              (notification.metadata?.project_title as string | undefined) ||
              (notification.metadata?.target_title as string | undefined);

            setDescriptionText(
              buildNotificationDescription(
                notification.type,
                action,
                display.name,
                targetTitle,
                notification.metadata
              )
            );
          }
        }
      } catch (error) {
        console.error('[InAppNotificationBanner] 발신자 표시 정보 조회 실패:', error);
      } finally {
        setIsLoadingPartner(false);
      }
    };

    loadDisplayInfo();
  }, [notification]);

  // 메시지 알림의 경우 방 제목 조회 (프로젝트/협업명)
  useEffect(() => {
    const loadRoomTitle = async () => {
      if (!notification) return;
      if (roomTitle) return;
      if (notification.type !== 'message') return;
      const roomId = notification.relatedId || notification.activityId;
      if (!roomId) return;
      try {
        const room = await messageService.getRoomById(roomId);
        if (room?.title) setRoomTitle(room.title);
      } catch (error) {
        console.error('[InAppNotificationBanner] 채팅방 정보 조회 실패:', error);
      }
    };
    loadRoomTitle();
  }, [notification, roomTitle]);

  // 메시지 내용에 sender 이름 반영
  useEffect(() => {
    if (!notification) return;
    if (notification.type !== 'message') return;
    if (!displayName) return;

    let messageContent = notification.description || '';

    // notification.description이 이미 "발신자: 메시지" 형태인 경우
    // 순수 메시지만 추출하여 발신자 이름 중복 방지
    const colonIndex = messageContent.indexOf(': ');
    if (colonIndex !== -1 && colonIndex < 50) {
      const possibleName = messageContent.substring(0, colonIndex);
      // 추출된 이름이 displayName 또는 senderName과 일치하면 메시지 부분만 사용
      if (possibleName === displayName || possibleName === notification.senderName) {
        messageContent = messageContent.substring(colonIndex + 2);
      }
    }

    setDescriptionText(
      buildNotificationDescription(
        'message',
        undefined,
        displayName,
        undefined,
        { messageContent }
      )
    );
  }, [notification, displayName]);

  // 멘션 알림 여부 확인 (type: message + metadata.mention_type: chat_mention)
  const isMention = notification?.type === 'message' && notification?.metadata?.mention_type === 'chat_mention';

  // Private 버킷 이미지를 위한 서명 URL 변환 (dev/prod 환경 차이 대응)
  const signedDisplayAvatar = useSignedImage(displayAvatar);
  const signedCoverImage = useSignedImage(coverImage);

  // 멘션 시에는 '채팅방에서 멘션되었습니다'(notification.title) 강제 표시
  const headerTitle = isMention
    ? notification.title // '채팅방에서 멘션되었습니다'
    : notification?.type === 'message'
      ? notification.metadata?.chat_room_name
      || notification.metadata?.room_title
      || roomTitle
      || notification.activityTitle
      || notification.title
      || displayName
      || notification?.senderName
      || '알 수 없음'
      : displayName || notification?.senderName || '알 수 없음';

  if (!notification) return null;

  const handleInteractionStart = () => setIsInteracting(true);
  const handleInteractionEnd = () => setIsInteracting(false);

  const handleDetailClick = async () => {
    // Mark as read immediately (optimistic update)
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Invalidate queries to ensure fresh data when NotificationModal opens
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

    // Handle follow/like notifications - open partner modal if applicable
    if (notification.type === 'follow' || notification.type === 'like') {
      if (notification.relatedId) {
        setIsLoadingPartner(true);
        try {
          const partner = await getPartnerById(notification.relatedId);
          if (partner) {
            // Only open modal for artists/creatives (partners)
            setSelectedPartner(partner);
            setShowPartnerModal(true);
            onClose();
          }
          // If partner is null, it's a fan/brand - do nothing
        } catch (error) {
          console.error('Failed to load partner:', error);
        } finally {
          setIsLoadingPartner(false);
        }
      }
      return;
    }

    // Navigate based on notification type - 통합 관리 페이지(/manage)로 라우팅
    if (notification.type === 'invitation') {
      // 초대 클릭 시 통합 관리 페이지의 초대 탭으로 이동
      const invitationId = notification.metadata?.invitation_id || notification.relatedId;
      if (invitationId) {
        navigate(`/manage?tab=invitations&invitationId=${invitationId}`);
      } else {
        navigate('/manage?tab=invitations');
      }
    } else if (notification.type === 'question' || notification.type === 'answer') {
      // 질문/답변 알림 - 해당 초대 상세 페이지로 이동
      const invitationId = notification.metadata?.invitation_id || notification.relatedId;
      const mode = notification.metadata?.mode || 'received';
      if (invitationId) {
        navigate(`/manage?tab=invitations&mode=${mode}&invitationId=${invitationId}`);
      } else {
        navigate(`/manage?tab=invitations&mode=${mode}`);
      }
    } else if (notification.type === 'message') {
      // 채팅방 ID 추출: activityId > relatedId > metadata.room_id 순서로 fallback
      const roomId = notification.activityId
        || notification.relatedId
        || (notification.metadata?.room_id as string);
      if (roomId) {
        // 메시지 캐시 무효화하여 최신 메시지 로드 (연이은 메시지가 안 보이는 문제 해결)
        queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
        queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
        navigate(`/messages/${roomId}`);
      }
    } else if (notification.type === 'application') {
      // 지원 알림 - applicationId로 모달 자동 열기
      const applicationId = notification.metadata?.application_id || notification.relatedId;
      const mode = notification.metadata?.mode || 'received'; // metadata에 mode가 있으면 사용, 없으면 기본값
      if (applicationId) {
        navigate(`/manage?tab=invitations&mode=${mode}&applicationId=${applicationId}`);
      } else {
        navigate(`/manage?tab=invitations&mode=${mode}`);
      }
    } else if (notification.type === 'talk_request') {
      // 새 대화 요청 알림 - receiver가 받음 → mode='received'
      const talkRequestId = notification.metadata?.talk_request_id || notification.relatedId;
      if (talkRequestId) {
        navigate(`/manage?tab=invitations&mode=received&talkRequestId=${talkRequestId}`);
      } else {
        navigate('/manage?tab=invitations&mode=received');
      }
    } else if (notification.type === 'talk_request_accepted') {
      // 대화 요청 수락 알림 - 채팅방이 있으면 채팅방으로, 없으면 관리 페이지로
      const chatRoomId = notification.metadata?.chat_room_id;
      if (chatRoomId) {
        navigate(`/messages/${chatRoomId}`);
      } else {
        navigate('/manage?tab=invitations');
      }
    } else if (notification.type === 'talk_request_rejected') {
      // 대화 요청 거절 알림 - sender가 받음 → mode='sent'
      const talkRequestId = notification.metadata?.talk_request_id || notification.relatedId;
      if (talkRequestId) {
        navigate(`/manage?tab=invitations&mode=sent&talkRequestId=${talkRequestId}`);
      } else {
        navigate('/manage?tab=invitations&mode=sent');
      }
    } else if (notification.type === 'member_left' || notification.type === 'member_removed') {
      // 멤버 퇴장/강제 퇴장 알림 - 해당 프로젝트/협업 상세 페이지 팀 탭으로
      const relatedType = notification.metadata?.related_type || notification.activityType;
      const entityId = notification.relatedId || notification.metadata?.project_id || notification.metadata?.collaboration_id;

      if (relatedType === 'project' && entityId) {
        navigate(`/explore/project/${entityId}?tab=team`);
      } else if (relatedType === 'collaboration' && entityId) {
        navigate(`/explore/collaboration/${entityId}?tab=members`);
      } else {
        navigate('/manage');
      }
    } else if (notification.type === 'partnership_inquiry') {
      // 파트너십 문의 알림 - 관리 페이지의 프로젝트 탭 > 파트너십 하위 탭으로 이동
      navigate('/manage?tab=projects&subTab=partnership');
    }
    onClose();
  };

  const handleAccept = async () => {
    setIsInteracting(true);
    try {
      if (notification.type === 'invitation') {
        await notificationActionService.acceptInvitation(notification.relatedId);

        // Mark as read and invalidate cache
        if (!notification.isRead) {
          markAsRead.mutate(notification.id);
        }
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

        setSuccessMessage('라잇이 켜졌어요! 초대를 수락했어요.');
        setShowSuccessModal(true);
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error('처리에 실패했어요.');
      setIsInteracting(false);
    }
  };

  const handleReject = async () => {
    try {
      if (notification.type === 'invitation') {
        await notificationActionService.rejectInvitation(notification.relatedId);

        // Mark as read and invalidate cache
        if (!notification.isRead) {
          markAsRead.mutate(notification.id);
        }
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

        setSuccessMessage('초대를 거절했어요.');
        setShowSuccessModal(true);
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error('처리에 실패했어요.');
    }
  };

  const handleReplySend = async () => {
    if (!replyText.trim()) return;
    try {
      if (notification.type === 'message' && notification.activityId) {
        await notificationActionService.replyToMessage(notification.activityId, replyText);

        // Mark as read and invalidate cache
        if (!notification.isRead) {
          markAsRead.mutate(notification.id);
        }
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });

        toast.success("답장이 전송되었어요.");
        setReplyText('');
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error('전송에 실패했어요.');
    }
  };

  const getBadgeLabel = (type: UserNotificationType) => {
    switch (type) {
      case 'invitation': return '새 초대';
      case 'message': return '새 메시지';
      case 'deadline': return '기한 임박';
      case 'application': return '새 지원';
      case 'status_change': return '상태 변경';
      case 'follow': return '새 팔로워';
      case 'like': return '새 좋아요';
      case 'question': return '새 질문';
      case 'answer': return '새 답변';
      case 'talk_request': return '대화 요청';
      case 'talk_request_accepted': return '요청 수락';
      case 'talk_request_rejected': return '요청 거절';
      case 'member_left': return '멤버 퇴장';
      case 'member_removed': return '퇴장 처리됨';
      case 'partnership_inquiry': return '파트너십 문의';
      default: return '알림';
    }
  };

  const getBadgeColor = (type: UserNotificationType) => {
    // Customize colors if needed, using CTA_BLUEish for primary ones
    switch (type) {
      case 'deadline': return '#EF4444'; // Red
      case 'question': return '#7c3aed'; // Purple-ish
      case 'answer': return '#2563eb';   // Blue
      default: return '#2563eb'; // Blue
    }
  };

  return (
    <>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -150, opacity: 0 }}
            animate={{
              y: 0,
              opacity: isDismissing ? 0 : 1,
              x: isDismissing ? (dismissDir > 0 ? 420 : -420) : 0,
            }}
            exit={{ y: -150, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            whileDrag={{ scale: 0.98 }}
            onDragStart={handleInteractionStart}
            onDragEnd={(_event, info) => {
              handleInteractionEnd();
              const distance = info.offset.x;
              const velocity = info.velocity.x;
              if (Math.abs(distance) > swipeThreshold || Math.abs(velocity) > 800) {
                setDismissDir(distance >= 0 ? 1 : -1);
                setIsDismissing(true);
                setTimeout(() => onDismiss(), 120);
              }
            }}
            style={{
              position: 'fixed',
              top: '10px',
              left: 0,
              right: 0,
              zIndex: 2000,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              backgroundColor: theme.palette.transparent.white,
            }}
          >
            <Paper
              elevation={4}
              onMouseEnter={handleInteractionStart}
              onMouseLeave={handleInteractionEnd}
              sx={{
                pointerEvents: 'auto',
                width: '90%',
                maxWidth: '400px',
                borderRadius: '16px',
                backgroundColor: theme.palette.transparent.white,
                backdropFilter: `blur(8px) saturate(180%)`,
                WebkitBackdropFilter: `blur(8px) saturate(180%)`,
                border: `1px solid ${theme.palette.transparent.white}`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                {/* Left: Avatar or Cover Image */}
                <Avatar
                  src={signedCoverImage || signedDisplayAvatar || undefined}
                  alt={displayName}
                  variant={signedCoverImage ? 'rounded' : 'circular'}
                  sx={{
                    width: 40,
                    height: 40,
                    '& img': signedCoverImage ? { objectFit: 'cover' } : {}
                  }}
                >
                  {displayName?.[0] || '?'}
                </Avatar>

                {/* Right: Content Area */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Row 1: Name + Badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827' }}>
                      {headerTitle}
                    </Typography>
                    <Chip
                      label={getBadgeLabel(notification.type)}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        bgcolor: '#EFF6FF', // Light blue bg
                        color: getBadgeColor(notification.type),
                        borderRadius: '6px',
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  </Box>

                  {/* Row 2: Content (Description) */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#374151',
                      mb: 0.5,
                      fontSize: 13,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                    onClick={handleDetailClick}
                  >
                    {descriptionText}
                  </Typography>

                  {/* Row 3: Time */}
                  <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 11, display: 'block', mb: 1.5 }}>
                    {formatRelativeTime(notification.createdAt)}
                  </Typography>

                  {/* Actions Row (Interactive Buttons / Inputs) */}
                  {/* 새 초대 알림에만 수락/거절 버튼 표시 (초대 응답 알림에는 표시 안함) */}
                  {notification.type === 'invitation' && notification.metadata?.action !== 'accepted' && notification.metadata?.action !== 'rejected' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAccept}
                        sx={{
                          borderRadius: '8px',
                          bgcolor: '#2563eb',
                          fontSize: 12,
                          textTransform: 'none',
                          fontWeight: 600,
                          flex: 1,
                          boxShadow: 'none',
                        }}
                      >
                        수락
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleReject}
                        sx={{
                          borderRadius: '8px',
                          borderColor: '#E5E7EB',
                          color: '#374151',
                          fontSize: 12,
                          textTransform: 'none',
                          fontWeight: 600,
                          flex: 1,
                        }}
                      >
                        거절
                      </Button>
                    </Box>
                  )}

                  {notification.type === 'message' && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="답장 입력..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onFocus={handleInteractionStart}
                        onBlur={(e) => !e.target.value && handleInteractionEnd()}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '20px',
                            bgcolor: '#F9FAFB',
                            fontSize: 13,
                            paddingRight: '4px',
                            '& fieldset': { borderColor: '#E5E7EB' }
                          },
                          '& .MuiOutlinedInput-input': {
                            padding: '8px 12px',
                          }
                        }}
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              size="small"
                              onClick={handleReplySend}
                              disabled={!replyText.trim()}
                              sx={{
                                color: '#2563eb',
                                p: 0.5,
                                opacity: replyText.trim() ? 1 : 0.5
                              }}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          )
                        }}
                      />
                    </Box>
                  )}

                  {/* Link for other types (excluding follow/like which are handled separately) */}
                  {!['invitation', 'message', 'follow', 'like'].includes(notification.type) && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#2563eb',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-block',
                        mt: 0.5
                      }}
                      onClick={handleDetailClick}
                    >
                      확인하기 &rarr;
                    </Typography>
                  )}

                  {/* Follow/Like - show link only if partner exists */}
                  {(notification.type === 'follow' || notification.type === 'like') && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#2563eb',
                        cursor: isLoadingPartner ? 'wait' : 'pointer',
                        fontWeight: 600,
                        display: 'inline-block',
                        mt: 0.5,
                        opacity: isLoadingPartner ? 0.6 : 1
                      }}
                      onClick={handleDetailClick}
                    >
                      {isLoadingPartner ? '로딩 중...' : '확인하기'}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      {/* Partner Detail Modal */}
      <Modal
        open={showPartnerModal}
        onClose={() => {
          setShowPartnerModal(false);
          setSelectedPartner(null);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            outline: 'none',
          }}
        >
          <PartnerDetailContent
            partner={selectedPartner}
            loading={isLoadingPartner}
            onClose={() => {
              setShowPartnerModal(false);
              setSelectedPartner(null);
            }}
            showBottomNavigation={false}
            isModal
          />
        </Box>
      </Modal>
    </>
  );
}
