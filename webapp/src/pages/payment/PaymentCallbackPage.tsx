import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import Header from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { paymentService } from '../../services/paymentService';
import { projectService } from '../../services/projectService';
import { userNotificationService } from '../../services/userNotificationService';
import { messageService } from '../../services/messageService';
import { usePaymentStore } from '../../stores/paymentStore';
import PaymentSuccessImage from '../../assets/images/payment_success.png';
import PaymentFailImage from '../../assets/images/payment_fail.png';

type CallbackStatus = 'processing' | 'success' | 'failed';

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clear, setLastError } = usePaymentStore();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [isProjectSettlement, setIsProjectSettlement] = useState(false);
  const [settledProjectId, setSettledProjectId] = useState<string | null>(null);

  // 방안 1: 뒤로가기 시 토스 결제 페이지로 가지 않도록 히스토리 조작
  const handlePopState = useCallback(() => {
    if (isProjectSettlement && settledProjectId) {
      navigate(`/explore/project/${settledProjectId}`, { replace: true, state: { fromPayment: true } });
    } else if (isProjectSettlement) {
      navigate('/explore', { replace: true });
    } else {
      navigate('/shop', { replace: true });
    }
  }, [navigate, isProjectSettlement, settledProjectId]);

  useEffect(() => {
    // 히스토리 스택에 현재 페이지를 추가하여 뒤로가기 시 popstate 이벤트 발생하도록 함
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handlePopState]);

  const callbackStatus = searchParams.get('status');
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amountParam = searchParams.get('amount');
  const failCode = searchParams.get('code');
  const failMessage = searchParams.get('message');

  const amount = useMemo(() => {
    if (!amountParam) return null;
    const parsed = Number(amountParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [amountParam]);

  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // 이미 처리된 경우 중복 실행 방지
    if (hasProcessedRef.current) return;

    const runConfirm = async () => {
      // 결제 처리 플래그 설정
      hasProcessedRef.current = true;

      if (callbackStatus === 'fail') {
        const errorMessage = failMessage ?? 'Payment failed';
        setStatus('failed');
        setLastError(errorMessage);
        return;
      }

      if (!paymentKey || !orderId || amount === null) {
        const errorMessage = 'Missing payment confirmation parameters';
        setStatus('failed');
        setLastError(errorMessage);
        return;
      }

      try {
        // First, get the order by tossOrderId to get the real UUID
        const order = await paymentService.getOrderByTossOrderId(orderId);

        if (!order) {
          throw new Error('주문을 찾을 수 없습니다.');
        }

        const response = await paymentService.confirmPayment({
          orderId: order.tossOrderId, // Use toss_order_id for Toss API
          paymentKey,
          amount,
          idempotencyKey: paymentKey,
        });

        if (response.success) {
          // Check if this is a project settlement payment (order already fetched above)

          if (order?.relatedType === 'project_settlement' && order.relatedId) {
            setIsProjectSettlement(true);
            setSettledProjectId(order.relatedId);

            try {
              // 1. Update project settlement status
              const confirmedBudget = typeof order.metadata?.confirmedBudget === 'number'
                ? order.metadata.confirmedBudget
                : amount;
              await projectService.updateProjectSettlement(
                order.relatedId,
                order.id, // Use the real UUID, not tossOrderId
                confirmedBudget
              );

              // 2. Get project details
              const project = await projectService.getProjectById(order.relatedId);
              if (!project) {
                console.error('[PaymentCallbackPage] Project not found:', order.relatedId);
                setStatus('success');
                clear();
                return;
              }

              // 3. Send notifications to team members
              try {
                const teamMemberIds = await projectService.getProjectTeamMemberIds(
                  order.relatedId,
                  project.createdBy
                );

                if (teamMemberIds.length > 0) {
                  const notifications = teamMemberIds.map(memberId => ({
                    receiver_id: memberId,
                    type: 'project_update' as const,
                    title: '프로젝트 정산 완료',
                    content: `"${project.title}" 프로젝트의 정산이 완료되었어요.`,
                    related_id: order.relatedId!,
                    related_type: 'project' as const,
                    metadata: {
                      projectId: order.relatedId,
                      projectTitle: project.title,
                      confirmedBudget,
                    },
                  }));

                  await userNotificationService.createBulkNotifications(notifications);
                }
              } catch (notificationError) {
                // Non-blocking: notification failure should not fail the payment
                console.error('[PaymentCallbackPage] Failed to send notifications:', notificationError);
              }

              // 4. Send system message to project chat room
              try {
                const roomId = await messageService.getRoomByProjectId(order.relatedId);
                if (roomId) {
                  await messageService.sendMessage(
                    roomId,
                    `${project.title} 정산이 완료되었습니다.`,
                    [],
                    undefined,
                    'system'
                  );
                }
              } catch (messageError) {
                // Non-blocking: message failure should not fail the payment
                console.error('[PaymentCallbackPage] Failed to send system message:', messageError);
              }
            } catch (postProcessError) {
              console.error('[PaymentCallbackPage] Post-processing failed:', postProcessError);
              // Still show success since payment was confirmed
            }
          }

          setStatus('success');
          clear();
          return;
        }

        const errorMessage = response.message ?? 'Payment confirmation failed';
        setStatus('failed');
        setLastError(errorMessage);
      } catch (error) {
        console.error('[PaymentCallbackPage] Confirmation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Payment confirmation failed';
        setStatus('failed');
        setLastError(errorMessage);
      }
    };

    runConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, callbackStatus, failCode, failMessage, orderId, paymentKey]);

  const handleNavigateBack = () => {
    if (isProjectSettlement && settledProjectId) {
      navigate(`/explore/project/${settledProjectId}`, { replace: true, state: { fromPayment: true } });
    } else if (isProjectSettlement) {
      navigate('/explore', { replace: true });
    } else {
      navigate('/shop', { replace: true });
    }
  };

  return (
    <Box
      sx={{
        pb: `${BOTTOM_NAV_HEIGHT}px`,
        minHeight: '100vh',
        bgcolor: '#FFFFFF',
        maxWidth: '768px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
        <Header />
      </Box>

      <Container sx={{ py: 3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {status === 'processing' && (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              결제 확인 중
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              결제를 확인하고 있습니다. 잠시만 기다려주세요.
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Box component="img" src={PaymentSuccessImage} alt="Success" sx={{ width: '100px', height: '100px', objectFit: 'contain', mb: 3 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, fontSize: '24px' }}>
              결제가 완료되었어요!
            </Typography>
            <Typography variant="body1" sx={{ color: '#666666', mb: 6, whiteSpace: 'pre-line', lineHeight: 1.4, fontSize: '14px' }}>
              {isProjectSettlement
                ? '프로젝트의 신뢰도가 높아졌어요\n프로젝트 카드에 신뢰배지를 달아드릴게요!'
                : '결제가 성공적으로 완료되었습니다.'}
            </Typography>
            {/* <Button
              variant="contained"
              onClick={handleNavigateBack}
              fullWidth
              sx={{
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '12px',
                bgcolor: '#2563EB',
                '&:hover': { bgcolor: '#1D4ED8' }
              }}
            >
              확인
            </Button> */}
          </Box>
        )}

        {status === 'failed' && (
          <Box sx={{ textAlign: 'center', width: '100%', }}>
            <Box component="img" src={PaymentFailImage} alt="Failed" sx={{ width: '100px', height: '100px', objectFit: 'contain', mb: 3 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, fontSize: '24px' }}>
              결제가 실패되었어요
            </Typography>
            <Typography variant="body1" sx={{ color: '#666666', mb: 6, whiteSpace: 'pre-line', lineHeight: 1.4, fontSize: '14px' }}>
              결제가 정상적으로 완료되지 않아{'\n'}
              프로젝트 정산이 진행되지 않았어요.{'\n'}
              결제 수단을 확인한 후 다시 시도해 주세요.
            </Typography>
            {/* <Button
              variant="contained"
              onClick={handleNavigateBack}
              fullWidth
              sx={{
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '12px',
                bgcolor: '#2563EB',
                '&:hover': { bgcolor: '#1D4ED8' },
              }}
            >
              확인
            </Button> */}
          </Box>
        )}
      </Container>
      <Button
        variant="contained"
        onClick={handleNavigateBack}
        fullWidth
        sx={{
          height: '52px',
          fontSize: '16px',
          fontWeight: 600,
          borderRadius: '12px',
          bgcolor: '#2563EB',
          '&:hover': { bgcolor: '#1D4ED8' },
          width: '90%',
          position: 'fixed',
          bottom: '140px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        확인
      </Button>
      <BottomNavigationBar />
    </Box>
  );
}
