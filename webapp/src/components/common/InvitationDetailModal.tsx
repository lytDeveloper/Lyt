/**
 * InvitationDetailModal Component
 * 통합 초대 상세 모달 - 프로젝트/협업 초대 상세 보기 및 Q&A
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  TextField,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Invitation, InvitationQAItem } from '../../types/invitation.types';
import { INVITATION_STATUS_CONFIG, INVITATION_TYPE_LABELS } from '../../types/invitation.types';
import { getCategoryLabel } from '../../constants/projectConstants';

interface InvitationDetailModalProps {
  open: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  mode: 'sent' | 'received';
  onWithdraw?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onAskQuestion?: (id: string, question: string) => void;
  onAnswerQuestion?: (id: string, answer: string, questionAskedAt?: string) => void;
}

export default function InvitationDetailModal({
  open,
  onClose,
  invitation,
  mode,
  onWithdraw,
  onAccept,
  onReject,
  onAskQuestion,
  onAnswerQuestion,
}: InvitationDetailModalProps) {
  const theme = useTheme();
  const [questionText, setQuestionText] = useState('');
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 낙관적 UI를 위한 로컬 질문/답변 상태
  const [localQuestionAnswers, setLocalQuestionAnswers] = useState<InvitationQAItem[]>([]);

  // 각 질문별 답변 입력 상태 (질문의 askedAt을 key로 사용)
  const [answerInputStates, setAnswerInputStates] = useState<Record<string, { show: boolean; text: string }>>({});

  // invitation이 변경되면 로컬 상태를 초기화
  // 의존성을 invitation 전체로 설정하여 refetch 후 새 데이터가 반영될 때도 동기화
  useEffect(() => {
    if (invitation?.questionAnswers) {
      setLocalQuestionAnswers([...invitation.questionAnswers]);
    } else {
      setLocalQuestionAnswers([]);
    }
    setAnswerInputStates({});
  }, [invitation]);

  if (!invitation) return null;

  const isPending = invitation.status === 'pending' || invitation.status === 'viewed';
  const sortedQuestionAnswers = [...localQuestionAnswers].sort(
    (a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
  );
  const latestQA = sortedQuestionAnswers[0];
  const historyQAs = sortedQuestionAnswers.slice(1);
  const hasAnyQA = sortedQuestionAnswers.length > 0;

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '');

  const handleAskQuestion = () => {
    if (questionText.trim() && onAskQuestion) {
      // 낙관적 UI 업데이트
      const newQuestion: InvitationQAItem = {
        question: questionText.trim(),
        askedAt: new Date().toISOString(),
        answer: undefined,
        answeredAt: undefined,
      };
      setLocalQuestionAnswers((prev) => [newQuestion, ...prev]);

      // 서버 요청
      onAskQuestion(invitation.id, questionText.trim());

      setQuestionText('');
      setShowQuestionInput(false);
    }
  };

  const handleAnswerQuestion = (qaAskedAt: string) => {
    const answerState = answerInputStates[qaAskedAt];
    if (answerState?.text.trim() && onAnswerQuestion) {
      // 낙관적 UI 업데이트
      setLocalQuestionAnswers((prev) =>
        prev.map((qa) =>
          qa.askedAt === qaAskedAt
            ? { ...qa, answer: answerState.text.trim(), answeredAt: new Date().toISOString() }
            : qa
        )
      );

      // 서버 요청 (questionAskedAt 전달)
      onAnswerQuestion(invitation.id, answerState.text.trim(), qaAskedAt);

      // 해당 질문의 답변 입력 상태 초기화
      setAnswerInputStates((prev) => {
        const newState = { ...prev };
        delete newState[qaAskedAt];
        return newState;
      });
    }
  };

  const toggleAnswerInput = (qaAskedAt: string) => {
    setAnswerInputStates((prev) => ({
      ...prev,
      [qaAskedAt]: {
        show: !prev[qaAskedAt]?.show,
        text: prev[qaAskedAt]?.text || '',
      },
    }));
  };

  const updateAnswerText = (qaAskedAt: string, text: string) => {
    setAnswerInputStates((prev) => ({
      ...prev,
      [qaAskedAt]: {
        show: prev[qaAskedAt]?.show ?? true,
        text,
      },
    }));
  };

  const statusConfig = INVITATION_STATUS_CONFIG[invitation.status];
  const typeLabel = INVITATION_TYPE_LABELS[invitation.invitationType];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', maxHeight: '70vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            {mode === 'sent' ? '보낸 초대 상세' : '받은 초대 상세'}
          </Typography>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              bgcolor: invitation.invitationType === 'project'
                ? theme.palette.grey[100]
                : theme.palette.grey[100],
              color: invitation.invitationType === 'project'
                ? theme.palette.subText.default
                : theme.palette.subText.default,
              fontWeight: 600,
              fontSize: 11,
            }}
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Target Info (Project/Collaboration) */}
        <Box sx={{ mb: 3, p: 2, bgcolor: theme.palette.grey[50], borderRadius: '12px' }}>
          {invitation.target?.coverImageUrl && (
            <Box
              component="img"
              src={invitation.target.coverImageUrl}
              alt={invitation.target.title}
              sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '8px', mb: 1.5 }}
            />
          )}
          {invitation.target?.brandName && (
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.5 }}>
              {invitation.target.brandName}
            </Typography>
          )}
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary }}>
            {invitation.target?.title || (invitation.invitationType === 'project' ? '프로젝트' : '협업')}
          </Typography>
          {invitation.target?.category && (
            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 0.5 }}>
              카테고리: {getCategoryLabel(invitation.target.category)}
            </Typography>
          )}
        </Box>

        {/* Person Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Avatar
            src={mode === 'sent' ? invitation.receiver?.avatarUrl : invitation.sender?.avatarUrl}
            sx={{ width: 48, height: 48 }}
          />
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: theme.palette.text.primary }}>
              {mode === 'sent' ? invitation.receiver?.name : invitation.sender?.name}
            </Typography>
            {(mode === 'sent' ? invitation.receiver?.activityField : invitation.sender?.activityField) && (
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                {mode === 'sent' ? invitation.receiver?.activityField : invitation.sender?.activityField}
              </Typography>
            )}
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={statusConfig.label}
              size="small"
              sx={{ bgcolor: statusConfig.bgcolor, color: statusConfig.color, fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Invitation Details */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
            초대 내용
          </Typography>
          {invitation.position && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>포지션</Typography>
              <Typography sx={{ fontSize: 14 }}>{invitation.position}</Typography>
            </Box>
          )}
          {invitation.responsibilities && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>역할/책임</Typography>
              <Typography sx={{ fontSize: 14 }}>{invitation.responsibilities}</Typography>
            </Box>
          )}
          {invitation.budgetRange && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>예산 범위</Typography>
              <Typography sx={{ fontSize: 14 }}>{invitation.budgetRange}</Typography>
            </Box>
          )}
          {invitation.duration && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>기간</Typography>
              <Typography sx={{ fontSize: 14 }}>{invitation.duration}</Typography>
            </Box>
          )}
          {invitation.message && (
            <Box sx={{ p: 1.5, bgcolor: theme.palette.grey[100], borderRadius: '8px', mt: 1 }}>
              <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, whiteSpace: 'pre-wrap' }}>
                {invitation.message}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Question/Answer Section */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
            질문/답변
          </Typography>

          {!hasAnyQA && (
            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
              아직 질문이 없어요.
            </Typography>
          )}

          {latestQA && (
            <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ p: 1.5, bgcolor: theme.palette.grey[100], borderRadius: '8px' }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: theme.palette.primary.contrastText,
                    bgcolor: theme.palette.primary.main,
                    mb: 0.5,
                    px: 1.2,
                    py: 0.25,
                    borderRadius: '20px',
                    width: 'fit-content',
                  }}
                >
                  질문 ({formatDate(latestQA.askedAt)})
                </Typography>
                <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, whiteSpace: 'pre-wrap' }}>
                  {latestQA.question}
                </Typography>
              </Box>

              {latestQA.answer ? (
                <Box sx={{ p: 1.5, bgcolor: theme.palette.grey[100], borderRadius: '8px' }}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                      bgcolor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      mb: 0.5,
                      px: 1.2,
                      py: 0.25,
                      borderRadius: '20px',
                      width: 'fit-content',
                    }}
                  >
                    답변 ({formatDate(latestQA.answeredAt)})
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, whiteSpace: 'pre-wrap' }}>
                    {latestQA.answer}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 1,
                    bgcolor: theme.palette.grey[100],
                    borderRadius: '8px',
                    border: `1px dashed ${theme.palette.divider}`,
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                    답변 대기중입니다.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {historyQAs.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowHistory((prev) => !prev)}
                sx={{ color: theme.palette.text.secondary, px: 0 }}
              >
                {showHistory ? '이전 질답 접기' : `이전 질답 ${historyQAs.length}개 보기`}
              </Button>

              {showHistory && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {historyQAs.map((qa, index) => (
                    <Box
                      key={`${qa.askedAt}-${index}`}
                      sx={{
                        p: 1.25,
                        borderRadius: '8px',
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.grey[50],
                      }}
                    >
                      <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.5 }}>
                        질문 ({formatDate(qa.askedAt)})
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: theme.palette.text.primary, whiteSpace: 'pre-wrap', mb: 0.75 }}>
                        {qa.question}
                      </Typography>
                      {qa.answer ? (
                        <>
                          <Divider sx={{ my: 0.75 }} />
                          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.5 }}>
                            답변 ({formatDate(qa.answeredAt)})
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: theme.palette.text.primary, whiteSpace: 'pre-wrap' }}>
                            {qa.answer}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.75 }}>
                            답변 대기중
                          </Typography>
                          {/* 보낸 초대에서만 답변 버튼 표시 */}
                          {mode === 'sent' && isPending && (
                            <>
                              {answerInputStates[qa.askedAt]?.show ? (
                                <Box sx={{ mt: 1 }}>
                                  <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    placeholder="답변을 입력하세요"
                                    value={answerInputStates[qa.askedAt]?.text || ''}
                                    onChange={(e) => updateAnswerText(qa.askedAt, e.target.value)}
                                    size="small"
                                    sx={{ mb: 1 }}
                                  />
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <Button size="small" onClick={() => toggleAnswerInput(qa.askedAt)} sx={{ borderRadius: '24px', fontSize: 12 }}>
                                      취소
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => handleAnswerQuestion(qa.askedAt)}
                                      sx={{ borderRadius: '24px', fontSize: 12 }}
                                    >
                                      답변 보내기
                                    </Button>
                                  </Box>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => toggleAnswerInput(qa.askedAt)}
                                    sx={{ borderRadius: '24px', fontSize: 12 }}
                                  >
                                    답변하기
                                  </Button>
                                </Box>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Ask Question (for received invitations) */}
          {mode === 'received' && isPending && (
            <>
              {showQuestionInput ? (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="질문을 입력하세요"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={() => setShowQuestionInput(false)} sx={{ borderRadius: '24px' }}>
                      취소
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAskQuestion}
                      sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, borderRadius: '24px' }}
                    >
                      질문 보내기
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowQuestionInput(true)}
                  sx={{ mt: 1, borderRadius: '24px' }}
                >
                  질문하기
                </Button>
              )}
            </>
          )}

          {/* Answer Question (for sent invitations with pending question) */}
          {mode === 'sent' && isPending && latestQA && !latestQA.answer && (
            <>
              {answerInputStates[latestQA.askedAt]?.show ? (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="답변을 입력하세요"
                    value={answerInputStates[latestQA.askedAt]?.text || ''}
                    onChange={(e) => updateAnswerText(latestQA.askedAt, e.target.value)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={() => toggleAnswerInput(latestQA.askedAt)} sx={{ borderRadius: '24px' }}>
                      취소
                    </Button>
                    <Button size="small" variant="contained" onClick={() => handleAnswerQuestion(latestQA.askedAt)} sx={{ borderRadius: '24px' }}>
                      답변 보내기
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => toggleAnswerInput(latestQA.askedAt)}
                  sx={{ mt: 1, borderRadius: '24px' }}
                >
                  답변하기
                </Button>
              )}
            </>
          )}
        </Box>

        {/* Rejection Reason */}
        {invitation.status === 'rejected' && invitation.rejectionReason && (
          <Box sx={{ p: 1.5, bgcolor: '#FEF2F2', borderRadius: '8px' }}>
            <Typography sx={{ fontSize: 12, color: '#991B1B', mb: 0.5 }}>거절 사유</Typography>
            <Typography sx={{ fontSize: 14, color: '#7F1D1D' }}>{invitation.rejectionReason}</Typography>
          </Box>
        )}

        {/* Date Info */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
            초대일: {new Date(invitation.sentDate).toLocaleDateString()}
          </Typography>
          {invitation.expiryDate && (
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
              만료일: {new Date(invitation.expiryDate).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {mode === 'sent' && isPending && onWithdraw && (
          <>
            <Button onClick={onClose} sx={{ color: theme.palette.text.secondary, borderRadius: '24px' }}>
              닫기
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => onWithdraw(invitation.id)}
              sx={{ borderRadius: '24px' }}
            >
              초대 철회
            </Button>
          </>
        )}
        {mode === 'received' && isPending && (
          <>
            <Button onClick={onClose} sx={{ color: theme.palette.text.secondary }}>
              닫기
            </Button>
            {onReject && (
              <Button
                variant="outlined"
                onClick={() => onReject(invitation.id)}
                sx={{ borderColor: theme.palette.divider, color: theme.palette.text.secondary, borderRadius: '24px' }}
              >
                거절하기
              </Button>
            )}
            {onAccept && (
              <Button
                variant="contained"
                onClick={() => onAccept(invitation.id)}
                sx={{ bgcolor: theme.palette.primary.main, boxShadow: 'none', borderRadius: '24px' }}
              >
                수락하기
              </Button>
            )}
          </>
        )}
        {!isPending && (
          <Button
            onClick={onClose}
            variant="contained"
            sx={{ bgcolor: theme.palette.primary.main, boxShadow: 'none', borderRadius: '24px' }}
          >
            닫기
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
